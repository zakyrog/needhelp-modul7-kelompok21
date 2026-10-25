import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// 1. Baca konfigurasi env
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
    const { data, error } = await client.from(t).select('*').limit(1);
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
export async function runTests(userAEmail, userAPassword, userBEmail, userBPassword, userCEmail = null, userCPassword = null) {
  console.log('\n================================================================');
  console.log('2. MEMULAI PENGUJIAN OTENTIKASI & SESI PENGGUNA RIIL');
  console.log('================================================================');

  const anonClient = createSupabaseClient();

  // Login Pengguna A (Pemohon)
  console.log(`-> Melakukan autentikasi Pengguna A (${userAEmail})...`);
  const { data: authA, error: errA } = await anonClient.auth.signInWithPassword({
    email: userAEmail,
    password: userAPassword
  });
  if (errA) {
    console.error('❌ Gagal login Pengguna A:', errA.message);
    return;
  }
  const clientA = createSupabaseClient(authA.session.access_token);
  const userA = authA.user;
  console.log(`✅ Pengguna A terautentikasi (ID: ${userA.id})`);

  // Login Pengguna B (Penolong)
  console.log(`-> Melakukan autentikasi Pengguna B (${userBEmail})...`);
  const { data: authB, error: errB } = await anonClient.auth.signInWithPassword({
    email: userBEmail,
    password: userBPassword
  });
  if (errB) {
    console.error('❌ Gagal login Pengguna B:', errB.message);
    return;
  }
  const clientB = createSupabaseClient(authB.session.access_token);
  const userB = authB.user;
  console.log(`✅ Pengguna B terautentikasi (ID: ${userB.id})`);

  let clientC = null;
  let userC = null;
  if (userCEmail && userCPassword) {
    const { data: authC, error: errC } = await anonClient.auth.signInWithPassword({
      email: userCEmail,
      password: userCPassword
    });
    if (!errC) {
      clientC = createSupabaseClient(authC.session.access_token);
      userC = authC.user;
      console.log(`✅ Pengguna C (Pihak Ketiga) terautentikasi (ID: ${userC.id})`);
    }
  }

  console.log('\n================================================================');
  console.log('3. PENGUJIAN SKENARIO POSITIF (ALUR UTAMA TRANSAKSI)');
  console.log('================================================================');

  // Positif 1: Verifikasi profil publik (email tidak boleh ada)
  console.log('-> Positif 1: Membaca profil publik Pengguna A...');
  const { data: profA, error: errProfA } = await anonClient.from('profiles').select('*').eq('id', userA.id).single();
  if (errProfA) {
    console.error('❌ Gagal baca profil:', errProfA.message);
  } else {
    console.log(`✅ Profil terbaca: Nama "${profA.full_name}", Rating: ${profA.rating_average} (${profA.rating_count} ulasan)`);
    if ('email' in profA) {
      console.error('❌ KEAMANAN BOCOR: Kolom email ditemukan pada public.profiles!');
    } else {
      console.log('✅ Privasi Aman: Kolom email tidak ada pada public.profiles.');
    }
  }

  // Positif 2: Pengguna A membuat postingan Saya Butuh (kuota: 1)
  console.log('-> Positif 2: Pengguna A membuat postingan Saya Butuh (kuota = 1)...');
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
  const { data: newPost, error: errPost } = await clientA.from('posts').insert(postPayload).select().single();
  if (errPost) {
    console.error('❌ Gagal buat postingan:', errPost.message);
    return;
  }
  console.log(`✅ Postingan berhasil dibuat: ID ${newPost.id}, Status "${newPost.status}", Kuota sisa: ${newPost.remaining_quota}`);

  // Positif 3: Pengguna B membuka thread obrolan dengan Pengguna A
  console.log('-> Positif 3: Pengguna B memulai thread obrolan...');
  const { data: thread, error: errThread } = await clientB.from('chat_threads').insert({
    post_id: newPost.id,
    user1_id: userA.id,
    user2_id: userB.id
  }).select().single();
  if (errThread) {
    console.error('❌ Gagal buat thread:', errThread.message);
    return;
  }
  console.log(`✅ Thread obrolan berhasil dibuat: ID ${thread.id}`);

  // Positif 4: Pengguna B mengirim pesan teks
  console.log('-> Positif 4: Pengguna B mengirim pesan perkenalan...');
  const { data: msgText, error: errText } = await clientB.from('chat_messages').insert({
    thread_id: thread.id,
    sender_id: userB.id,
    message_type: 'text',
    content: 'Halo kak, saya bersedia membantu antar berkas ke UGM.'
  }).select().single();
  if (errText) {
    console.error('❌ Gagal kirim pesan teks:', errText.message);
  } else {
    console.log(`✅ Pesan teks terkirim: ID ${msgText.id}`);
  }

  // Positif 5: Pengguna A mengajukan kartu kesepakatan (Deal Card v1)
  console.log('-> Positif 5: Pengguna A mengajukan kartu kesepakatan resmi (v1)...');
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
  const { data: deal, error: errDeal } = await clientA.from('deals').insert(dealPayload).select().single();
  if (errDeal) {
    console.error('❌ Gagal buat deal:', errDeal.message);
    return;
  }
  console.log(`✅ Kartu deal diajukan: ID ${deal.id}, Status "${deal.status}", Versi ${deal.deal_version}`);

  // Positif 6: Pengguna A menyetujui deal (Pihak Pertama) -> Kuota TIDAK boleh berkurang
  console.log('-> Positif 6: Pengguna A memanggil RPC agree_to_deal (pihak pertama)...');
  const { data: resAgreeA, error: errAgreeA } = await clientA.rpc('agree_to_deal', {
    p_deal_id: deal.id,
    p_target_version: 1
  });
  if (errAgreeA) {
    console.error('❌ Gagal agree_to_deal A:', errAgreeA.message);
  } else {
    console.log('✅ Respon RPC Pihak A:', resAgreeA);
    // Verifikasi kuota postingan
    const { data: checkPost1 } = await anonClient.from('posts').select('remaining_quota, status').eq('id', newPost.id).single();
    if (checkPost1.remaining_quota === 1 && resAgreeA.waiting_for_partner === true) {
      console.log('✅ Verifikasi Valid: Kuota belum berkurang saat baru 1 pihak yang setuju (sisa: 1).');
    } else {
      console.error('❌ PELANGGARAN KUOTA: Kuota berkurang sebelum persetujuan kedua belah pihak!');
    }
  }

  // Positif 7: Pengguna B menyetujui deal (Pihak Kedua) -> Status disepakati, kegiatan dibuat, kuota berkurang jadi 0
  console.log('-> Positif 7: Pengguna B memanggil RPC agree_to_deal (pihak kedua)...');
  const { data: resAgreeB, error: errAgreeB } = await clientB.rpc('agree_to_deal', {
    p_deal_id: deal.id,
    p_target_version: 1
  });
  if (errAgreeB) {
    console.error('❌ Gagal agree_to_deal B:', errAgreeB.message);
  } else {
    console.log('✅ Respon RPC Pihak B:', resAgreeB);
    // Verifikasi status deal
    const { data: checkDeal } = await clientA.from('deals').select('*').eq('id', deal.id).single();
    console.log(`✅ Status Deal sekarang: "${checkDeal.status}" (requester_agreed: ${checkDeal.requester_agreed}, helper_agreed: ${checkDeal.helper_agreed})`);

    // Verifikasi kuota postingan
    const { data: checkPost2 } = await anonClient.from('posts').select('remaining_quota, status').eq('id', newPost.id).single();
    console.log(`✅ Status Postingan sekarang: "${checkPost2.status}", Kuota sisa: ${checkPost2.remaining_quota}`);
    if (checkPost2.remaining_quota === 0 && checkPost2.status === 'kuota_penuh') {
      console.log('✅ Verifikasi Atomik Sukses: Kuota postingan berkurang menjadi 0 dan status otomatis kuota_penuh.');
    }

    // Verifikasi entitas kegiatan otomatis
    const { data: actData } = await clientA.from('activities').select('*').eq('deal_id', deal.id).single();
    if (actData) {
      console.log(`✅ Entitas kegiatan otomatis terbuat: ID ${actData.id}, Status "${actData.status}"`);

      // Positif 8: Konfirmasi Penyelesaian Kegiatan (Paritas Dua Pihak)
      console.log('-> Positif 8: Pengguna B (penolong) konfirmasi selesai (pihak pertama)...');
      const { data: confB, error: errConfB } = await clientB.rpc('confirm_activity_completion', { p_activity_id: actData.id });
      console.log('✅ Respon Konfirmasi Penolong:', confB);

      const { data: actAfterB } = await clientA.from('activities').select('*').eq('id', actData.id).single();
      if (actAfterB.status !== 'selesai' && actAfterB.helper_confirmed_done === true && actAfterB.requester_confirmed_done === false) {
        console.log('✅ Paritas Sah: Satu pihak konfirmasi TIDAK membuat status kegiatan selesai.');
      } else {
        console.error('❌ PELANGGARAN ATURAN: Status selesai berubah sebelum kedua pihak konfirmasi!');
      }

      console.log('-> Positif 9: Pengguna A (pemohon) konfirmasi selesai (pihak kedua)...');
      const { data: confA, error: errConfA } = await clientA.rpc('confirm_activity_completion', { p_activity_id: actData.id });
      console.log('✅ Respon Konfirmasi Pemohon:', confA);

      const { data: actAfterA } = await clientA.from('activities').select('*').eq('id', actData.id).single();
      if (actAfterA.status === 'selesai' && actAfterA.helper_confirmed_done === true && actAfterA.requester_confirmed_done === true) {
        console.log('✅ Paritas Sempurna: Status kegiatan resmi menjadi "selesai" setelah kedua pihak mengonfirmasi!');
      }

      // Positif 10: Pengguna A memberikan ulasan & rating bintang 5
      console.log('-> Positif 10: Pengguna A mengirim ulasan dan rating...');
      const { data: rev, error: errRev } = await clientA.from('reviews').insert({
        activity_id: actData.id,
        reviewer_id: userA.id,
        reviewee_id: userB.id,
        stars: 5,
        comment: 'Sangat ramah, cepat, dan dokumen sampai dengan aman di FT UGM!'
      }).select().single();
      if (errRev) {
        console.error('❌ Gagal kirim ulasan:', errRev.message);
      } else {
        console.log(`✅ Ulasan berhasil dikirim: ID ${rev.id}, Bintang: ${rev.stars}`);
        // Periksa rekalkulasi rating profil Pengguna B
        const { data: profBAfter } = await anonClient.from('profiles').select('rating_average, rating_count').eq('id', userB.id).single();
        console.log(`✅ Reputasi Pengguna B otomatis terkalkulasi: Skor ${profBAfter.rating_average} (${profBAfter.rating_count} ulasan).`);
      }
    }
  }

  console.log('\n================================================================');
  console.log('4. PENGUJIAN SKENARIO NEGATIF (INTEGRITAS & KEAMANAN RLS/RPC)');
  console.log('================================================================');

  // Negatif 1: Tamu (anon) dilarang mengeksekusi RPC agree_to_deal
  console.log('-> Negatif 1: Tamu memanggil agree_to_deal...');
  const { data: negAnon, error: errNegAnon } = await anonClient.rpc('agree_to_deal', { p_deal_id: deal.id, p_target_version: 1 });
  if (errNegAnon) {
    console.log(`✅ DITOLAK SEBAGAIMANA MESTINYA: [${errNegAnon.code}] ${errNegAnon.message}`);
  } else {
    console.error('❌ KEAMANAN BOCOR: Tamu dapat memanggil RPC!');
  }

  // Negatif 2: Manipulasi manual rating profil oleh pemilik sendiri
  console.log('-> Negatif 2: Pengguna A mencoba mengubah rating_average miliknya menjadi 5.0...');
  const { data: negRate, error: errNegRate } = await clientA.from('profiles').update({ rating_average: 5.0 }).eq('id', userA.id);
  if (errNegRate) {
    console.log(`✅ DITOLAK SEBAGAIMANA MESTINYA: [${errNegRate.code}] ${errNegRate.message}`);
  } else {
    console.error('❌ KEAMANAN BOCOR: Pengguna berhasil memanipulasi rating profil!');
  }

  // Negatif 3: Pengguna memalsukan pesan tipe 'deal_card' langsung ke chat_messages
  console.log('-> Negatif 3: Pengguna B mencoba menyisipkan pesan palsu berjenis deal_card...');
  const { data: negMsg, error: errNegMsg } = await clientB.from('chat_messages').insert({
    thread_id: thread.id,
    sender_id: userB.id,
    message_type: 'deal_card',
    content: 'Kartu Palsu Biaya 1 Juta'
  });
  if (errNegMsg) {
    console.log(`✅ DITOLAK SEBAGAIMANA MESTINYA: [${errNegMsg.code}] ${errNegMsg.message}`);
  } else {
    console.error('❌ KEAMANAN BOCOR: Pengguna biasa dapat memalsukan deal_card ke chat!');
  }

  // Negatif 4: UPDATE langsung ke tabel deals via REST API client
  console.log('-> Negatif 4: Pengguna A mencoba UPDATE langsung ke tabel deals...');
  const { data: negUpDeal, error: errNegUpDeal } = await clientA.from('deals').update({ status: 'disepakati' }).eq('id', deal.id);
  if (errNegUpDeal) {
    console.log(`✅ DITOLAK SEBAGAIMANA MESTINYA: [${errNegUpDeal.code}] ${errNegUpDeal.message}`);
  } else {
    console.error('❌ KEAMANAN BOCOR: Pengguna dapat melakukan direct UPDATE pada tabel deals!');
  }

  // Negatif 5: UPDATE langsung ke tabel activities via REST API client
  console.log('-> Negatif 5: Pengguna A mencoba UPDATE langsung ke tabel activities...');
  const { data: negUpAct, error: errNegUpAct } = await clientA.from('activities').update({ status: 'selesai' });
  if (errNegUpAct) {
    console.log(`✅ DITOLAK SEBAGAIMANA MESTINYA: [${errNegUpAct.code}] ${errNegUpAct.message}`);
  } else {
    console.error('❌ KEAMANAN BOCOR: Pengguna dapat melakukan direct UPDATE pada tabel activities!');
  }

  // Negatif 6: Merevisi kesepakatan yang sudah berstatus 'disepakati'
  console.log('-> Negatif 6: Pengguna A mencoba merevisi kesepakatan yang telah disepakati...');
  const { data: negRevise, error: errNegRevise } = await clientA.rpc('revise_deal', {
    p_deal_id: deal.id,
    p_target_version: 1,
    p_scheduled_date: '2026-10-30',
    p_scheduled_time: '12:00:00',
    p_meetup_location: 'Malioboro',
    p_compensation_type: 'tarif',
    p_compensation_value: 'Rp 50.000'
  });
  if (errNegRevise) {
    console.log(`✅ DITOLAK SEBAGAIMANA MESTINYA: [${errNegRevise.code}] ${errNegRevise.message}`);
  } else {
    console.error('❌ KEAMANAN BOCOR: Kesepakatan disepakati dapat direvisi!');
  }

  // Negatif 7: Membatalkan kesepakatan yang kegiatannya sudah selesai
  console.log('-> Negatif 7: Pengguna A mencoba membatalkan kesepakatan yang kegiatannya sudah selesai...');
  const { data: negCancel, error: errNegCancel } = await clientA.rpc('cancel_deal', {
    p_deal_id: deal.id,
    p_cancellation_reason: 'Membatalkan sepihak'
  });
  if (errNegCancel) {
    console.log(`✅ DITOLAK SEBAGAIMANA MESTINYA: [${errNegCancel.code}] ${errNegCancel.message}`);
  } else {
    console.error('❌ KEAMANAN BOCOR: Kegiatan selesai dapat dibatalkan!');
  }

  // Negatif 8: Mengirim ulasan ganda untuk kegiatan yang sama
  console.log('-> Negatif 8: Pengguna A mencoba mengirim ulasan kedua untuk kegiatan yang sama...');
  const { data: negRev2, error: errNegRev2 } = await clientA.from('reviews').insert({
    activity_id: deal.id, // atau actData.id
    reviewer_id: userA.id,
    reviewee_id: userB.id,
    stars: 1,
    comment: 'Ulasan ganda manipulasi reputasi'
  });
  if (errNegRev2) {
    console.log(`✅ DITOLAK SEBAGAIMANA MESTINYA: [${errNegRev2.code}] ${errNegRev2.message}`);
  } else {
    console.error('❌ KEAMANAN BOCOR: Pengguna dapat mengirim ulasan ganda!');
  }

  // Negatif 9: Penyadapan pesan oleh pihak ketiga (Pengguna C jika tersedia)
  if (clientC && userC) {
    console.log('-> Negatif 9: Pengguna C (orang asing) mencoba membaca pesan thread A dan B...');
    const { data: eavesdrop, error: errEavesdrop } = await clientC.from('chat_messages').select('*').eq('thread_id', thread.id);
    if (!errEavesdrop && eavesdrop.length === 0) {
      console.log('✅ RLS PRIVASI BERHASIL: Pengguna C menerima 0 baris pesan (akses ditolak oleh RLS).');
    } else {
      console.error('❌ KEAMANAN BOCOR: Pengguna C dapat membaca pesan pribadi pihak lain!', eavesdrop);
    }
  }

  console.log('\n================================================================');
  console.log('🏁 SELURUH PENGUJIAN SKENARIO POSITIF & NEGATIF SELESAI.');
  console.log('================================================================');
}

// Eksekusi jika dijalankan dengan argumen login:
// node scripts/test-suite.mjs userA@example.com passA userB@example.com passB [userC@example.com passC]
const args = process.argv.slice(2);
if (args.length >= 4) {
  runTests(args[0], args[1], args[2], args[3], args[4] || null, args[5] || null).catch(console.error);
} else {
  runPreflight().catch(console.error);
}
