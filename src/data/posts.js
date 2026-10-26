import { EXAMPLE_POSTS_FIXTURE } from "./examplePostsFixture.js";

// Data seed bawaan resmi NeedHelp Jogja: 12 contoh postingan komunitas Yogyakarta
const postsData = EXAMPLE_POSTS_FIXTURE.map((p) => ({
  ...p,
  date: p.planned_date || p.date,
  planned_date: p.planned_date || p.date,
  time: p.start_time || p.time,
  start_time: p.start_time || p.time,
  endTime: p.end_time || p.endTime,
  end_time: p.end_time || p.endTime,
  compensation: p.compensation_type || p.compensation,
  compensation_type: p.compensation_type || p.compensation,
  compensationNote: p.compensation_note || p.compensationNote,
  compensation_note: p.compensation_note || p.compensationNote,
  address: p.address,
  address_general: p.address_general || p.address,
  destination: p.destination || "",
  quota: p.quota || 1,
  remainingQuota: p.remaining_quota !== undefined ? p.remaining_quota : 1,
  remaining_quota: p.remaining_quota !== undefined ? p.remaining_quota : 1,
  authorId: p.authorId || (p.profiles?.full_name ? p.profiles.full_name.toLowerCase().replace(/[^a-z0-9]+/g, "-") : p.id),
  createdAt: p.created_at || p.createdAt,
  created_at: p.created_at || p.createdAt,
  isExample: true,
}));

export default postsData;
