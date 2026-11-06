import test from "node:test";
import assert from "node:assert/strict";

import {
  sanitizeString,
  validateHelpProposal,
  validateLogin,
  validatePost,
  validateRating,
} from "../src/lib/validation.js";

const validPost = {
  nature: "butuh",
  title: "Butuh teman diskusi",
  category: "pendampingan",
  description: "Saya membutuhkan teman untuk berdiskusi tentang tugas kuliah.",
  date: "2999-12-31",
  time: "10:00",
  region: "sleman",
  address: "Perpustakaan kampus",
  destination: "",
  compensation: "sukarela",
  amount: "",
  terms: true,
};

test("validasi postingan menerima data lengkap", () => {
  assert.deepEqual(validatePost(validPost), {});
});

test("validasi postingan menolak tarif nol dan persetujuan kosong", () => {
  const errors = validatePost({
    ...validPost,
    compensation: "tarif",
    amount: "0",
    terms: false,
  });

  assert.ok(errors.amount);
  assert.ok(errors.terms);
});

test("login demo hanya menerima kredensial yang benar", () => {
  assert.deepEqual(validateLogin("demo@needhelp.test", "NeedHelp123!"), {});
  assert.ok(validateLogin("demo@needhelp.test", "salahsekali").general);
});

test("validasi rating dan penawaran bantuan memiliki batas minimum", () => {
  assert.ok(validateRating(0, "pendek").rating);
  assert.ok(validateRating(5, "pendek").comment);
  assert.ok(
    validateHelpProposal({
      helper_name: "A",
      helper_whatsapp: "123",
      helper_message: "singkat",
      helper_time: "",
    }).helper_whatsapp,
  );
});

test("sanitasi menghapus pembatas tag dan merapikan spasi", () => {
  assert.equal(sanitizeString("  <b>Judul</b>  "), "bJudul/b");
});
