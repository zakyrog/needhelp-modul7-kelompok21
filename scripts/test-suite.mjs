import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// 1. Baca konfigurasi Supabase dari .env.local
try {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.substring(0, idx).trim();
      const val = trimmed.substring(idx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
} catch (e) {
  console.warn('Warning: Could not parse .env.local:', e.message);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in .env.local');
  process.exit(1);
}

export function createSupabaseClient(accessToken = null) {
  return createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
    }
  });
}

// 2. Preflight database probe
export async function runPreflight() {
  console.log('================================================================');
  console.log('1. PEMERIKSAAN KESIAPAN BASIS DATA (PREFLIGHT)');
  console.log('Target URL:', supabaseUrl);
  console.log('================================================================');

  const client = createSupabaseClient();
  const tables = ['profiles', 'posts', 'chat_threads', 'chat_messages', 'deals', 'activities', 'reviews'];
  let allTablesExist = true;

  for (const t of tables) {
    const { error } = await client.from(t).select('*').limit(1);
    if (error) {
      console.log(`❌ Tabel '${t}': [${error.code}] ${error.message}`);
      allTablesExist = false;
    } else {
      console.log(`✅ Tabel '${t}': Ditemukan di schema cache.`);
    }
  }

  return allTablesExist;
}

// 3. Harness pengujian skenario normal dan negatif
export async function runTests(creds) {
  const summary = [];
  function record(id, title, status, details = '') {
    summary.push({ id, title, status, details });
    const symbol = status === 'LULUS' ? '✅' : status === 'GAGAL' ? '❌' : '⏳';
    console.log(`${symbol} [${status}] ${id}: ${title} ${details ? '(' + details + ')' : ''}`);
  }

  console.log('\n================================================================');
  console.log('2. MEMULAI PENGUJIAN OTENTIKASI & SESI PENGGUNA RIIL');
  console.log('================================================================');

  const anonClient = createSupabaseClient();
  let clientA = null, userA = null;
  let clientB = null, userB = null;
  let clientC = null, userC = null;

  // Autentikasi Pengguna A (Pemohon)
  try {
    const { data: authA, error: errA } = await anonClient.auth.signInWithPassword({
      email: creds.userA.email,
      password: creds.userA.password
    });
    if (errA) throw errA;
    clientA = createSupabaseClient(authA.session.access_token);
    userA = authA.user;
    record('AUTH-01', 'Login Pengguna A (Pemohon)', 'LULUS', `UID: ${userA.id.slice(0, 8)}...`);
  } catch (e) {
    record('AUTH-01', 'Login Pengguna A (Pemohon)', 'GAGAL', e.message);
  }

  // Autentikasi Pengguna B (Penolong)
  try {
    const { data: authB, error: errB } = await anonClient.auth.signInWithPassword({
      email: creds.userB.email,
      password: creds.userB.password
    });
    if (errB) throw errB;
    clientB = createSupabaseClient(authB.session.access_token);
    userB = authB.user;
    record('AUTH-02', 'Login Pengguna B (Penolong)', 'LULUS', `UID: ${userB.id.slice(0, 8)}...`);
  } catch (e) {
    record('AUTH-02', 'Login Pengguna B (Penolong)', 'GAGAL', e.message);
  }

  // Autentikasi Pengguna C (Pihak Ketiga - Opsional)
  if (creds.userC && creds.userC.email && creds.userC.password) {
    try {
      const { data: authC, error: errC } = await anonClient.auth.signInWithPassword({
        email: creds.userC.email,
        password: creds.userC.password
      });
      if (errC) throw errC;
      clientC = createSupabaseClient(authC.session.access_token);
      userC = authC.user;
      record('AUTH-03', 'Login Pengguna C (Pihak Ketiga)', 'LULUS', `UID: ${userC.id.slice(0, 8)}...`);
    } catch (e) {
      record('AUTH-03', 'Login Pengguna C (Pihak Ketiga)', 'GAGAL', e.message);
    }
  } else {
    record('AUTH-03', 'Login Pengguna C (Pihak Ketiga)', 'BELUM DIUJI', 'Kredensial C tidak disertakan');
  }

  if (!clientA || !clientB) {
    console.error('\n❌ Pengujian tidak dapat dilanjutkan karena autentikasi Pengguna A atau B gagal.');
    printReport(summary);
    return;
  }

  console.log('\n================================================================');
  console.log('3. PENGUJIAN SKENARIO POSITIF (ALUR UTAMA TRANSAKSI)');
  console.log('================================================================');

  // Positif 1: Verifikasi profil publik (email tidak boleh ada)
  try {
    const { data: profA, error: errProfA } = await anonClient.from('profiles').select('*').eq('id', userA.id).single();
    if (errProfA) throw errProfA;
    if ('email' in profA) {
      record('POS-01', 'Privasi Profil Publik (Tanpa Email)', 'GAGAL', 'Kolom email bocor pada tabel public.profiles');
    } else {
      record('POS-01', 'Privasi Profil Publik (Tanpa Email)', 'LULUS', `Nama: ${profA.full_name}, Rating: ${profA.rating_average}`);
    }
  } catch (e) {
    record('POS-01', 'Privasi Profil Publik (Tanpa Email)', 'GAGAL', e.message);
  }

  // Positif 2: Pengguna A membuat postingan Saya Butuh (kuota = 1)
  let newPost = null;
  try {
    const postPayload = {
      author_id: userA.id,
      nature: 'butuh',
      title: 'Bantuan Antar Berkas Kampus UGM',
      category: 'bantuan',
      description: 'Butuh bantuan mengantar map dokumen ke kantor dekanat Fakultas Teknik UGM.',
      planned_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      start_time: '10:00:00',
      region: 'sleman',
      address_general: 'Sekitar Bundaran UGM',
      compensation_type: 'tarif',
      amount: 25000,
      quota: 1,
      remaining_quota: 1,
      status: 'aktif'
    };
    const { data, error } = await clientA.from('posts').insert(postPayload).select().single();
    if (error) throw error;
    newPost = data;
    record('POS-02', 'Pembuatan Postingan Saya Butuh', 'LULUS', `Post ID: ${newPost.id.slice(0, 8)}..., Kuota: ${newPost.remaining_quota}`);
  } catch (e) {
    record('POS-02', 'Pembuatan Postingan Saya Butuh', 'GAGAL', e.message);
  }

  // Positif 3: Pengguna B membuka thread obrolan dengan Pengguna A
  let thread = null;
  if (newPost) {
    try {
      const { data, error } = await clientB.from('chat_threads').insert({
        post_id: newPost.id,
        user1_id: userA.id,
        user2_id: userB.id
      }).select().single();
      if (error) throw error;
      thread = data;
      record('POS-03', 'Inisiasi Thread Obrolan oleh Mitra', 'LULUS', `Thread ID: ${thread.id.slice(0, 8)}...`);
    } catch (e) {
      record('POS-03', 'Inisiasi Thread Obrolan oleh Mitra', 'GAGAL', e.message);
    }
  } else {
    record('POS-03', 'Inisiasi Thread Obrolan oleh Mitra', 'BELUM DIUJI', 'Tergantung postingan POS-02');
  }

  // Positif 4: Pengguna B mengirim pesan teks
  if (thread) {
    try {
      const { data, error } = await clientB.from('chat_messages').insert({
        thread_id: thread.id,
        sender_id: userB.id,
        message_type: 'text',
        content: 'Halo kak, saya bersedia membantu antar berkas ke UGM.'
      }).select().single();
      if (error) throw error;
      record('POS-04', 'Pengiriman Pesan Teks Chat', 'LULUS', `Message ID: ${data.id.slice(0, 8)}...`);
    } catch (e) {
      record('POS-04', 'Pengiriman Pesan Teks Chat', 'GAGAL', e.message);
    }
  } else {
    record('POS-04', 'Pengiriman Pesan Teks Chat', 'BELUM DIUJI', 'Tergantung thread POS-03');
  }

  // Positif 5: Pengguna A mengajukan kartu kesepakatan (Deal Card v1)
  let deal = null;
  if (newPost && thread) {
    try {
      const dealPayload = {
        post_id: newPost.id,
        thread_id: thread.id,
        requester_id: userA.id,
        helper_id: userB.id,
        scheduled_date: newPost.planned_date,
        scheduled_time: '10:00:00',
        meetup_location: 'Gerbang Utama UGM',
        compensation_type: 'tarif',
        compensation_value: 'Rp 25.000',
        requester_agreed: false,
        helper_agreed: false,
        deal_version: 1,
        status: 'diajukan'
      };
      const { data, error } = await clientA.from('deals').insert(dealPayload).select().single();
      if (error) throw error;
      deal = data;
      record('POS-05', 'Pengajuan Kartu Kesepakatan (v1)', 'LULUS', `Deal ID: ${deal.id.slice(0, 8)}..., Status: ${deal.status}`);
    } catch (e) {
      record('POS-05', 'Pengajuan Kartu Kesepakatan (v1)', 'GAGAL', e.message);
    }
  } else {
    record('POS-05', 'Pengajuan Kartu Kesepakatan (v1)', 'BELUM DIUJI', 'Tergantung POS-02 & POS-03');
  }

  // Positif 6: Persetujuan Pihak Pertama (Pengguna A) -> Kuota TIDAK boleh berkurang
  if (deal && newPost) {
    try {
      const { data: resAgreeA, error: errAgreeA } = await clientA.rpc('agree_to_deal', {
        p_deal_id: deal.id,
        p_target_version: 1
      });
      if (errAgreeA) throw errAgreeA;

      const { data: checkPost1 } = await anonClient.from('posts').select('remaining_quota, status').eq('id', newPost.id).single();
      if (checkPost1.remaining_quota === 1 && resAgreeA.waiting_for_partner === true) {
        record('POS-06', 'Persetujuan Pihak Pertama (Kuota Utuh)', 'LULUS', 'Kuota tetap 1, menunggu mitra');
      } else {
        record('POS-06', 'Persetujuan Pihak Pertama (Kuota Utuh)', 'GAGAL', `Kuota berkurang prematur: ${checkPost1.remaining_quota}`);
      }
    } catch (e) {
      record('POS-06', 'Persetujuan Pihak Pertama (Kuota Utuh)', 'GAGAL', e.message);
    }
  } else {
    record('POS-06', 'Persetujuan Pihak Pertama (Kuota Utuh)', 'BELUM DIUJI', 'Tergantung deal POS-05');
  }

  // Positif 7: Persetujuan Pihak Kedua (Pengguna B) -> Status disepakati, kegiatan dibuat, kuota berkurang jadi 0
  let actData = null;
  if (deal && newPost) {
    try {
      const { data: resAgreeB, error: errAgreeB } = await clientB.rpc('agree_to_deal', {
        p_deal_id: deal.id,
        p_target_version: 1
      });
      if (errAgreeB) throw errAgreeB;

      const { data: checkPost2 } = await anonClient.from('posts').select('remaining_quota, status').eq('id', newPost.id).single();
      const { data: checkDeal } = await clientA.from('deals').select('*').eq('id', deal.id).single();
      const { data: act } = await clientA.from('activities').select('*').eq('deal_id', deal.id).single();
      actData = act;

      if (checkDeal.status === 'disepakati' && checkPost2.remaining_quota === 0 && checkPost2.status === 'kuota_penuh' && actData) {
        record('POS-07', 'Persetujuan Pihak Kedua & Kunci Kuota Atomik', 'LULUS', 'Deal disepakati, kuota = 0, kegiatan tercipta');
      } else {
        record('POS-07', 'Persetujuan Pihak Kedua & Kunci Kuota Atomik', 'GAGAL', `Deal: ${checkDeal.status}, Kuota: ${checkPost2.remaining_quota}`);
      }
    } catch (e) {
      record('POS-07', 'Persetujuan Pihak Kedua & Kunci Kuota Atomik', 'GAGAL', e.message);
    }
  } else {
    record('POS-07', 'Persetujuan Pihak Kedua & Kunci Kuota Atomik', 'BELUM DIUJI', 'Tergantung deal POS-05');
  }

  // Positif 8 & 9: Konfirmasi Penyelesaian Kegiatan (Wajib Kedua Pihak)
  if (actData) {
    try {
      // Penolong konfirmasi duluan
      const { data: confB, error: errConfB } = await clientB.rpc('confirm_activity_completion', { p_activity_id: actData.id });
      if (errConfB) throw errConfB;

      const { data: actAfterB } = await clientA.from('activities').select('*').eq('id', actData.id).single();
      if (actAfterB.status !== 'selesai' && actAfterB.helper_confirmed_done === true && actAfterB.requester_confirmed_done === false) {
        record('POS-08', 'Konfirmasi Tunggal Penolong (Status Tetap Aktif)', 'LULUS', 'Status belum selesai, menunggu konfirmasi pemohon');
      } else {
        record('POS-08', 'Konfirmasi Tunggal Penolong (Status Tetap Aktif)', 'GAGAL', `Status berubah prematur: ${actAfterB.status}`);
      }

      // Pemohon konfirmasi berikutnya
      const { data: confA, error: errConfA } = await clientA.rpc('confirm_activity_completion', { p_activity_id: actData.id });
      if (errConfA) throw errConfA;

      const { data: actAfterA } = await clientA.from('activities').select('*').eq('id', actData.id).single();
      if (actAfterA.status === 'selesai' && actAfterA.helper_confirmed_done === true && actAfterA.requester_confirmed_done === true) {
        record('POS-09', 'Konfirmasi Kedua Pihak Lengkap (Status Selesai)', 'LULUS', 'Status resmi selesai setelah kedua pihak konfirmasi');
      } else {
        record('POS-09', 'Konfirmasi Kedua Pihak Lengkap (Status Selesai)', 'GAGAL', `Status tidak selesai: ${actAfterA.status}`);
      }
    } catch (e) {
      record('POS-08', 'Konfirmasi Tunggal Penolong (Status Tetap Aktif)', 'GAGAL', e.message);
      record('POS-09', 'Konfirmasi Kedua Pihak Lengkap (Status Selesai)', 'GAGAL', e.message);
    }
  } else {
    record('POS-08', 'Konfirmasi Tunggal Penolong (Status Tetap Aktif)', 'BELUM DIUJI', 'Tergantung kegiatan POS-07');
    record('POS-09', 'Konfirmasi Kedua Pihak Lengkap (Status Selesai)', 'BELUM DIUJI', 'Tergantung kegiatan POS-07');
  }

  // Positif 10: Pengguna A mengirim ulasan bintang 5 & auto-recalculate profil
  if (actData) {
    try {
      const { data: rev, error: errRev } = await clientA.from('reviews').insert({
        activity_id: actData.id,
        reviewer_id: userA.id,
        reviewee_id: userB.id,
        stars: 5,
        comment: 'Sangat ramah, cepat, dan dokumen sampai dengan aman di FT UGM!'
      }).select().single();
      if (errRev) throw errRev;

      const { data: profBAfter } = await anonClient.from('profiles').select('rating_average, rating_count').eq('id', userB.id).single();
      if (Number(profBAfter.rating_average) > 0 && profBAfter.rating_count >= 1) {
        record('POS-10', 'Pengiriman Ulasan & Rekalkulasi Reputasi Profil', 'LULUS', `Skor: ${profBAfter.rating_average} (${profBAfter.rating_count} ulasan)`);
      } else {
        record('POS-10', 'Pengiriman Ulasan & Rekalkulasi Reputasi Profil', 'GAGAL', `Skor rating tidak terupdate otomatis: ${profBAfter.rating_average}`);
      }
    } catch (e) {
      record('POS-10', 'Pengiriman Ulasan & Rekalkulasi Reputasi Profil', 'GAGAL', e.message);
    }
  } else {
    record('POS-10', 'Pengiriman Ulasan & Rekalkulasi Reputasi Profil', 'BELUM DIUJI', 'Tergantung kegiatan POS-07');
  }

  console.log('\n================================================================');
  console.log('4. PENGUJIAN SKENARIO NEGATIF (INTEGRITAS & KEAMANAN RLS/RPC)');
  console.log('================================================================');

  // Negatif 1: Tamu (anon) dilarang mengeksekusi RPC agree_to_deal
  if (deal) {
    try {
      const { error } = await anonClient.rpc('agree_to_deal', { p_deal_id: deal.id, p_target_version: 1 });
      if (error) {
        record('NEG-01', 'Penolakan Tamu (Anonim) pada RPC agree_to_deal', 'LULUS', `Ditolak: ${error.message}`);
      } else {
        record('NEG-01', 'Penolakan Tamu (Anonim) pada RPC agree_to_deal', 'GAGAL', 'Tamu diizinkan memanggil RPC');
      }
    } catch (e) {
      record('NEG-01', 'Penolakan Tamu (Anonim) pada RPC agree_to_deal', 'LULUS', `Ditolak: ${e.message}`);
    }
  } else {
    record('NEG-01', 'Penolakan Tamu (Anonim) pada RPC agree_to_deal', 'BELUM DIUJI', 'Tergantung deal POS-05');
  }

  // Negatif 2: Manipulasi manual rating profil oleh pemilik sendiri
  try {
    const { error } = await clientA.from('profiles').update({ rating_average: 5.0 }).eq('id', userA.id);
    if (error) {
      record('NEG-02', 'Penolakan Manipulasi Manual rating_average Profil', 'LULUS', `Ditolak: ${error.message}`);
    } else {
      record('NEG-02', 'Penolakan Manipulasi Manual rating_average Profil', 'GAGAL', 'Pengguna berhasil update rating_average');
    }
  } catch (e) {
    record('NEG-02', 'Penolakan Manipulasi Manual rating_average Profil', 'LULUS', `Ditolak: ${e.message}`);
  }

  // Negatif 3: Pengguna memalsukan pesan tipe 'deal_card' langsung ke chat_messages
  if (thread) {
    try {
      const { error } = await clientB.from('chat_messages').insert({
        thread_id: thread.id,
        sender_id: userB.id,
        message_type: 'deal_card',
        content: 'Kartu Palsu Biaya 1 Juta'
      });
      if (error) {
        record('NEG-03', 'Penolakan Spoofing Pesan deal_card via REST Client', 'LULUS', `Ditolak: ${error.message}`);
      } else {
        record('NEG-03', 'Penolakan Spoofing Pesan deal_card via REST Client', 'GAGAL', 'Pesan deal_card palsu lolos RLS');
      }
    } catch (e) {
      record('NEG-03', 'Penolakan Spoofing Pesan deal_card via REST Client', 'LULUS', `Ditolak: ${e.message}`);
    }
  } else {
    record('NEG-03', 'Penolakan Spoofing Pesan deal_card via REST Client', 'BELUM DIUJI', 'Tergantung thread POS-03');
  }

  // Negatif 4: UPDATE langsung ke tabel deals via REST API client
  if (deal) {
    try {
      const { error } = await clientA.from('deals').update({ status: 'disepakati' }).eq('id', deal.id);
      if (error) {
        record('NEG-04', 'Penolakan UPDATE Langsung pada Tabel deals', 'LULUS', `Ditolak: ${error.message}`);
      } else {
        record('NEG-04', 'Penolakan UPDATE Langsung pada Tabel deals', 'GAGAL', 'Direct UPDATE pada tabel deals berhasil');
      }
    } catch (e) {
      record('NEG-04', 'Penolakan UPDATE Langsung pada Tabel deals', 'LULUS', `Ditolak: ${e.message}`);
    }
  } else {
    record('NEG-04', 'Penolakan UPDATE Langsung pada Tabel deals', 'BELUM DIUJI', 'Tergantung deal POS-05');
  }

  // Negatif 5: UPDATE langsung ke tabel activities via REST API client
  if (actData) {
    try {
      const { error } = await clientA.from('activities').update({ status: 'selesai' }).eq('id', actData.id);
      if (error) {
        record('NEG-05', 'Penolakan UPDATE Langsung pada Tabel activities', 'LULUS', `Ditolak: ${error.message}`);
      } else {
        record('NEG-05', 'Penolakan UPDATE Langsung pada Tabel activities', 'GAGAL', 'Direct UPDATE pada tabel activities berhasil');
      }
    } catch (e) {
      record('NEG-05', 'Penolakan UPDATE Langsung pada Tabel activities', 'LULUS', `Ditolak: ${e.message}`);
    }
  } else {
    record('NEG-05', 'Penolakan UPDATE Langsung pada Tabel activities', 'BELUM DIUJI', 'Tergantung kegiatan POS-07');
  }

  // Negatif 6: Merevisi kesepakatan yang sudah berstatus 'disepakati'
  if (deal) {
    try {
      const { error } = await clientA.rpc('revise_deal', {
        p_deal_id: deal.id,
        p_target_version: 1,
        p_scheduled_date: '2026-10-30',
        p_scheduled_time: '12:00:00',
        p_meetup_location: 'Malioboro',
        p_compensation_type: 'tarif',
        p_compensation_value: 'Rp 50.000'
      });
      if (error) {
        record('NEG-06', 'Penolakan Revisi pada Deal yang Sudah Disepakati', 'LULUS', `Ditolak: ${error.message}`);
      } else {
        record('NEG-06', 'Penolakan Revisi pada Deal yang Sudah Disepakati', 'GAGAL', 'Revisi lolos pada status disepakati');
      }
    } catch (e) {
      record('NEG-06', 'Penolakan Revisi pada Deal yang Sudah Disepakati', 'LULUS', `Ditolak: ${e.message}`);
    }
  } else {
    record('NEG-06', 'Penolakan Revisi pada Deal yang Sudah Disepakati', 'BELUM DIUJI', 'Tergantung deal POS-05');
  }

  // Negatif 7: Membatalkan kesepakatan yang kegiatannya sudah selesai
  if (deal) {
    try {
      const { error } = await clientA.rpc('cancel_deal', {
        p_deal_id: deal.id,
        p_cancellation_reason: 'Membatalkan sepihak'
      });
      if (error) {
        record('NEG-07', 'Penolakan Pembatalan pada Kegiatan yang Sudah Selesai', 'LULUS', `Ditolak: ${error.message}`);
      } else {
        record('NEG-07', 'Penolakan Pembatalan pada Kegiatan yang Sudah Selesai', 'GAGAL', 'Pembatalan lolos pada kegiatan selesai');
      }
    } catch (e) {
      record('NEG-07', 'Penolakan Pembatalan pada Kegiatan yang Sudah Selesai', 'LULUS', `Ditolak: ${e.message}`);
    }
  } else {
    record('NEG-07', 'Penolakan Pembatalan pada Kegiatan yang Sudah Selesai', 'BELUM DIUJI', 'Tergantung deal POS-05');
  }

  // Negatif 8: Mengirim ulasan ganda untuk kegiatan yang sama
  if (actData) {
    try {
      const { error } = await clientA.from('reviews').insert({
        activity_id: actData.id,
        reviewer_id: userA.id,
        reviewee_id: userB.id,
        stars: 1,
        comment: 'Ulasan ganda kedua untuk manipulasi skor'
      });
      if (error) {
        record('NEG-08', 'Penolakan Pengiriman Ulasan Ganda pada Kegiatan Sama', 'LULUS', `Ditolak: ${error.message}`);
      } else {
        record('NEG-08', 'Penolakan Pengiriman Ulasan Ganda pada Kegiatan Sama', 'GAGAL', 'Ulasan ganda lolos constraint unik');
      }
    } catch (e) {
      record('NEG-08', 'Penolakan Pengiriman Ulasan Ganda pada Kegiatan Sama', 'LULUS', `Ditolak: ${e.message}`);
    }
  } else {
    record('NEG-08', 'Penolakan Pengiriman Ulasan Ganda pada Kegiatan Sama', 'BELUM DIUJI', 'Tergantung kegiatan POS-07');
  }

  // Negatif 9: Penyadapan pesan oleh pihak ketiga (Pengguna C jika tersedia)
  if (clientC && userC && thread) {
    try {
      const { data, error } = await clientC.from('chat_messages').select('*').eq('thread_id', thread.id);
      if (error) {
        record('NEG-09', 'Penyadapan Pesan Chat oleh Pihak Ketiga (RLS)', 'LULUS', `Akses ditolak: ${error.message}`);
      } else if (data.length === 0) {
        record('NEG-09', 'Penyadapan Pesan Chat oleh Pihak Ketiga (RLS)', 'LULUS', '0 baris dikembalikan (terisolasi oleh RLS)');
      } else {
        record('NEG-09', 'Penyadapan Pesan Chat oleh Pihak Ketiga (RLS)', 'GAGAL', `Pengguna C dapat membaca ${data.length} pesan privat`);
      }
    } catch (e) {
      record('NEG-09', 'Penyadapan Pesan Chat oleh Pihak Ketiga (RLS)', 'LULUS', `Ditolak: ${e.message}`);
    }
  } else {
    record('NEG-09', 'Penyadapan Pesan Chat oleh Pihak Ketiga (RLS)', 'BELUM DIUJI', 'Pengguna C tidak dikonfigurasi');
  }

  printReport(summary);
}

function printReport(summary) {
  console.log('\n================================================================');
  console.log('📊 REKAPITULASI LAPORAN HASIL PENGUJIAN');
  console.log('================================================================');
  let passCount = 0, failCount = 0, uncheckCount = 0;
  for (const item of summary) {
    if (item.status === 'LULUS') passCount++;
    else if (item.status === 'GAGAL') failCount++;
    else uncheckCount++;
    const symbol = item.status === 'LULUS' ? '✅' : item.status === 'GAGAL' ? '❌' : '⏳';
    console.log(`${symbol} [${item.status.padEnd(11)}] ${item.id.padEnd(8)} | ${item.title}`);
  }
  console.log('----------------------------------------------------------------');
  console.log(`TOTAL: ${summary.length} Skenario | LULUS: ${passCount} | GAGAL: ${failCount} | BELUM DIUJI: ${uncheckCount}`);
  console.log('================================================================\n');
}

// 4. Loader kredensial (mendukung file lokal atau argumen CLI)
async function main() {
  const args = process.argv.slice(2);
  let creds = null;

  // Cek argumen CLI: emailA passA emailB passB [emailC passC]
  if (args.length >= 4) {
    creds = {
      userA: { email: args[0], password: args[1] },
      userB: { email: args[2], password: args[3] },
      userC: args.length >= 6 ? { email: args[4], password: args[5] } : null
    };
  } else {
    // Cek file .test-credentials.local.json
    const credsPath = '.test-credentials.local.json';
    if (fs.existsSync(credsPath)) {
      try {
        const fileContent = fs.readFileSync(credsPath, 'utf8');
        const parsed = JSON.parse(fileContent);
        if (parsed.userA && parsed.userB) {
          creds = parsed;
        }
      } catch (e) {
        console.warn('Warning: Gagal membaca .test-credentials.local.json:', e.message);
      }
    }

    // Jika belum ada di JSON, cek variabel TEST_USER_* di env
    if (!creds && process.env.TEST_USER_A_EMAIL && process.env.TEST_USER_A_PASSWORD && process.env.TEST_USER_B_EMAIL && process.env.TEST_USER_B_PASSWORD) {
      creds = {
        userA: { email: process.env.TEST_USER_A_EMAIL, password: process.env.TEST_USER_A_PASSWORD },
        userB: { email: process.env.TEST_USER_B_EMAIL, password: process.env.TEST_USER_B_PASSWORD },
        userC: (process.env.TEST_USER_C_EMAIL && process.env.TEST_USER_C_PASSWORD) ? {
          email: process.env.TEST_USER_C_EMAIL,
          password: process.env.TEST_USER_C_PASSWORD
        } : null
      };
    }
  }

  if (creds) {
    await runTests(creds);
  } else {
    await runPreflight();
    console.log('\nℹ️ Petunjuk: Masukkan kredensial pengujian ke file .test-credentials.local.json');
    console.log('atau jalankan: node scripts/test-suite.mjs <emailA> <passA> <emailB> <passB>');
  }
}

main().catch(console.error);
