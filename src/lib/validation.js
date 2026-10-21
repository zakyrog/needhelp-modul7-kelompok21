import { CATEGORY_LABELS, REGION_LABELS, COMPENSATION_LABELS, CURRENT_USER } from "./data.js";

export function validatePost(values, today = new Date().toISOString().slice(0, 10)) {
  const errors = {};
  const title = (values.title || "").trim();
  const description = (values.description || "").trim();
  const address = (values.address || "").trim();

  if (!["butuh", "bisa"].includes(values.nature)) {
    errors.nature = "Pilih jenis postingan.";
  }
  if (title.length < 5) {
    errors.title = "Judul minimal 5 karakter.";
  } else if (title.length > 100) {
    errors.title = "Judul maksimal 100 karakter.";
  }
  if (!CATEGORY_LABELS[values.category]) {
    errors.category = "Pilih kategori aktivitas.";
  }
  if (description.length < 20) {
    errors.description = "Deskripsi minimal 20 karakter.";
  }
  if (!values.date) {
    errors.date = "Tanggal rencana wajib diisi.";
  } else if (values.date < today) {
    errors.date = "Tanggal rencana tidak boleh di masa lalu.";
  }
  if (!values.time) {
    errors.time = "Waktu mulai wajib diisi.";
  }
  if (!REGION_LABELS[values.region]) {
    errors.region = "Pilih wilayah pelaksanaan.";
  }
  if (address.length < 5) {
    errors.address = "Titik lokasi minimal 5 karakter.";
  }
  if (!COMPENSATION_LABELS[values.compensation]) {
    errors.compensation = "Pilih model kompensasi.";
  }
  if (values.compensation === "tarif") {
    const amount = Number(values.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      errors.amount = "Nominal tarif harus lebih dari 0.";
    }
  }
  if (!values.terms) {
    errors.terms = "Setujui pedoman komunitas untuk melanjutkan.";
  }

  return errors;
}

export function validateLogin(email, password) {
  const errors = {};
  const emailValue = (email || "").trim().toLowerCase();
  const passwordValue = password || "";

  if (!emailValue) {
    errors.email = "Email wajib diisi.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
    errors.email = "Format email tidak valid.";
  }

  if (!passwordValue) {
    errors.password = "Password wajib diisi.";
  } else if (passwordValue.length < 8) {
    errors.password = "Password minimal 8 karakter.";
  }

  if (Object.keys(errors).length === 0) {
    if (emailValue !== CURRENT_USER.email || passwordValue !== "NeedHelp123!") {
      errors.general = "Email atau password salah. Gunakan akun demo yang tersedia.";
    }
  }

  return errors;
}

export function validateRating(stars, comment) {
  const errors = {};
  const numStars = Number(stars);
  const cleanComment = (comment || "").trim();

  if (!Number.isInteger(numStars) || numStars < 1 || numStars > 5) {
    errors.rating = "Pilih rating 1 sampai 5 bintang.";
  }
  if (cleanComment.length < 10) {
    errors.comment = "Ulasan minimal 10 karakter.";
  }

  return errors;
}

export function validateHelpProposal(values) {
  const errors = {};
  const name = (values.helper_name || "").trim();
  const phone = (values.helper_whatsapp || "").trim();
  const message = (values.helper_message || "").trim();
  const time = (values.helper_time || "").trim();

  if (name.length < 3) {
    errors.helper_name = "Nama wajib diisi minimal 3 karakter.";
  }
  if (phone.length < 9) {
    errors.helper_whatsapp = "Nomor kontak wajib diisi (minimal 9 digit).";
  }
  if (message.length < 10) {
    errors.helper_message = "Pesan bantuan minimal 10 karakter.";
  }
  if (!time) {
    errors.helper_time = "Waktu bantuan wajib diisi.";
  }

  return errors;
}
