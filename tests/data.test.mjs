import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  CURRENT_USER,
  POSTS_KEY,
  STORAGE_SYNC_EVENT,
  createPost,
  filterPosts,
  getUserPosts,
} from "../src/lib/data.js";

class MemoryStorage {
  #values = new Map();

  getItem(key) {
    return this.#values.has(key) ? this.#values.get(key) : null;
  }

  setItem(key, value) {
    this.#values.set(key, String(value));
  }

  removeItem(key) {
    this.#values.delete(key);
  }

  clear() {
    this.#values.clear();
  }
}

const localStorage = new MemoryStorage();
const events = new EventTarget();

globalThis.window = {
  localStorage,
  location: { search: "" },
  addEventListener: events.addEventListener.bind(events),
  removeEventListener: events.removeEventListener.bind(events),
  dispatchEvent: events.dispatchEvent.bind(events),
};

beforeEach(() => {
  localStorage.clear();
});

test("createPost menyimpan data terstruktur dan mengirim event sinkronisasi", () => {
  let changedKey = null;
  const listener = (event) => {
    changedKey = event.detail.key;
  };
  events.addEventListener(STORAGE_SYNC_EVENT, listener, { once: true });

  const post = createPost(
    {
      nature: "butuh",
      title: "  Butuh teman diskusi  ",
      description: "Deskripsi bantuan yang cukup panjang untuk pengujian.",
      category: "pendampingan",
      region: "sleman",
      address: "Perpustakaan kampus",
      destination: "",
      date: "2999-12-31",
      time: "10:00",
      compensation: "sukarela",
      compensationNote: "",
    },
    CURRENT_USER,
  );

  assert.equal(changedKey, POSTS_KEY);
  assert.equal(post.title, "Butuh teman diskusi");
  assert.equal(getUserPosts()[0].id, post.id);
});

test("filterPosts mencari judul dan mematuhi filter jenis", () => {
  const posts = [
    {
      id: "satu",
      nature: "butuh",
      title: "Belajar matematika",
      summary: "Integral",
      description: "Belajar bersama",
      category: "pendampingan",
      region: "sleman",
      compensation: "sukarela",
      authorId: "budi-pratama",
    },
    {
      id: "dua",
      nature: "bisa",
      title: "Menemani kuliner",
      summary: "Malioboro",
      description: "Jalan santai",
      category: "explore",
      region: "kota",
      compensation: "patungan",
      authorId: "rina-putri",
    },
  ];

  assert.deepEqual(
    filterPosts(posts, { query: "matematika", type: "butuh" }).map(
      (post) => post.id,
    ),
    ["satu"],
  );
  assert.deepEqual(filterPosts(posts, { type: "bisa" }).map((post) => post.id), [
    "dua",
  ]);
});
