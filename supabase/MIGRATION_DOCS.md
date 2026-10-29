# Dokumentasi Migration NeedHelp

## Urutan Migration yang Benar

```
001_public_read_access.sql
002_activities_table.sql
003_help_applications.sql
004_accept_reject_withdraw.sql
004b_alter_activities_fk_to_restrict.sql   ← BARU: Ubah FK CASCADE → RESTRICT
005_partner_access_fk_audit_complete_rating.sql
006_cancel_activity_rpc.sql
007_remove_activities_write_policies.sql
```

**PENTING:** Migration 004b HARUS dijalankan SEBELUM migration 005. Migration 005 akan gagal jika FK activities.post_id masih menggunakan ON DELETE CASCADE.

## Konsekuensi ON DELETE RESTRICT

### Sebelum (CASCADE)
- Menghapus post → semua activity terkait terhapus otomatis
- History bantuan, rating, dan ulasan hilang
- Data loss risk tinggi

### Sesudah (RESTRICT)
- Menghapus post dengan activity terkait → **DITOLAK** oleh database
- Error: `violates foreign key constraint "activities_post_id_restrict_fkey"`
- History bantuan terlindungi
- User harus batalkan/selesaikan activity terlebih dahulu sebelum hapus post

## Perilaku Aplikasi Ketika Post Memiliki Activity

### deletePostSupabase (src/lib/data.js)
1. Cek apakah post memiliki activity terkait (early validation)
2. Jika ada activity → tolak dengan pesan jelas:
   > "Postingan ini tidak dapat dihapus karena masih memiliki riwayat aktivitas. Batalkan atau selesaikan semua aktivitas terlebih dahulu sebelum menghapus postingan."
3. Jika tidak ada activity → lanjutkan penghapusan
4. Fallback: jika race condition menyebabkan FK violation saat delete, tangani error code 23503 dengan pesan yang sama

### Caller (detail-postingan/page.js)
- handleDelete menampilkan error message via toast notification
- User mendapat feedback yang jelas mengapa penghapusan gagal

## Hal yang Wajib Diverifikasi di Staging

### 1. Urutan Migration
- [ ] Jalankan migration berurutan: 001 → 002 → 003 → 004 → 004b → 005 → 006 → 007
- [ ] Verifikasi migration 004b berhasil mengubah FK
- [ ] Verifikasi migration 005 berhasil (tidak gagal karena FK audit)

### 2. FK Verification Query
```sql
-- Cek FK activities.post_id setelah migration 004b
SELECT
    con.conname AS constraint_name,
    conf.relname AS referenced_table,
    CASE con.confdeltype
        WHEN 'a' THEN 'NO ACTION'
        WHEN 'r' THEN 'RESTRICT'
        WHEN 'c' THEN 'CASCADE'
        WHEN 'n' THEN 'SET NULL'
        WHEN 'd' THEN 'SET DEFAULT'
    END AS on_delete_rule
FROM pg_constraint con
INNER JOIN pg_class conf ON conf.oid = con.confrelid
WHERE con.conrelid = 'public.activities'::regclass
  AND con.contype = 'f';
```

Expected result: `on_delete_rule = 'RESTRICT'`

### 3. Delete Post Behavior
- [ ] Buat post tanpa activity → hapus → harus berhasil
- [ ] Buat post dengan activity status 'menunggu' → coba hapus → harus ditolak dengan pesan jelas
- [ ] Buat post dengan activity status 'berlangsung' → coba hapus → harus ditolak
- [ ] Buat post dengan activity status 'selesai' → coba hapus → harus ditolak
- [ ] Batalkan semua activity → hapus post → harus berhasil

### 4. RPC Functions
- [ ] cancel_activity berfungsi setelah policy write dihapus (migration 007)
- [ ] complete_activity berfungsi setelah policy write dihapus
- [ ] save_activity_rating berfungsi setelah policy write dihapus
- [ ] accept_help_application masih bisa insert/update activity via SECURITY DEFINER

### 5. Mode Demo
- [ ] Mode demo tetap berfungsi (tidak terpengaruh perubahan FK)
- [ ] Tombol "Mulai Aktivitas" hanya muncul di mode demo
- [ ] Semua operasi localStorage berjalan normal

## Catatan tentang Migration 005

Migration 005 memiliki komentar di line 6 yang menyebutkan "ubah CASCADE → RESTRICT". Komentar ini **MENYESATKAN** karena:
- Migration 005 TIDAK mengubah FK dari CASCADE ke RESTRICT
- Migration 005 hanya mengaudit FK dan akan **GAGAL** jika menemukan CASCADE
- Perubahan FK sebenarnya dilakukan di migration 004b

Komentar di migration 005 tidak diubah untuk menjaga konsistensi histori migration. Dokumen ini menjadi sumber kebenaran untuk perilaku aktual.

## Risiko yang Tersisa

1. **Race condition pada deletePostSupabase**: Antara cek activity dan delete post, activity baru bisa dibuat. Fallback error handling (error code 23503) menangani kasus ini.

2. **Retry 40P01 belum diimplementasikan**: Deadlock mungkin terjadi under high concurrency. Lock order konsisten mengurangi risiko tapi tidak menghilangkan.

3. **Idempotency mechanism belum ada**: Jangan retry otomatis tanpa konfirmasi hasil.

4. **Function ownership belum diverifikasi**: SECURITY DEFINER bypass RLS hanya jika function owner adalah superuser/table owner. Perlu verifikasi di staging:
   ```sql
   SELECT proname, proowner::regrole
   FROM pg_proc
   WHERE pronamespace = 'public'::regnamespace
     AND proname IN ('cancel_activity', 'complete_activity', 'save_activity_rating', 'accept_help_application');
   ```
