import { acquireMentorLock, releaseMentorLock, isRedisAvailable } from "../src/lib/redis";

async function runTest() {
  console.log("=== Testing Redis Mentor Lock (Ticket-Booking Guard) ===");

  if (!isRedisAvailable()) {
    console.warn("Redis is not available. Skipping live Redis lock test.");
    process.exit(0);
  }

  const testMentorId = "test_mentor_12345";
  const studentA = "student_alex";
  const studentB = "student_jordan";

  // Step 1: Student A acquires lock (10s TTL to allow multi-step network test)
  console.log("Step 1: Student A acquiring lock...");
  const tokenA = await acquireMentorLock(testMentorId, studentA, {
    ttlSeconds: 10,
    retryCount: 0,
  });

  if (!tokenA || tokenA === "redis-bypass") {
    console.error("Failed: Student A could not acquire lock.", tokenA);
    process.exit(1);
  }
  console.log("Success: Student A acquired lock with token:", tokenA);

  // Step 2: Student B attempts to acquire lock concurrently (0 retries) -> must be blocked
  console.log("Step 2: Student B attempting to acquire lock concurrently (0 retries)...");
  const tokenB = await acquireMentorLock(testMentorId, studentB, {
    ttlSeconds: 10,
    retryCount: 0,
  });

  if (tokenB !== null) {
    console.error("Failed: Student B should have been blocked, but got:", tokenB);
    process.exit(1);
  }
  console.log("Success: Student B was correctly blocked by Redis single-threaded lock!");

  // Step 3: Test safe release protection (wrong token should not release lock)
  console.log("Step 3: Attempting release with fake token...");
  const fakeRelease = await releaseMentorLock(testMentorId, "fake_token_xyz");
  if (fakeRelease) {
    console.error("Failed: Fake token released the lock!");
    process.exit(1);
  }
  console.log("Success: Fake token was rejected by Lua script!");

  // Step 4: Student A safely releases lock
  console.log("Step 4: Student A releasing lock with correct token...");
  const realRelease = await releaseMentorLock(testMentorId, tokenA);
  if (!realRelease) {
    console.error("Failed: Student A could not release lock!");
    process.exit(1);
  }
  console.log("Success: Lock released cleanly by Student A!");

  // Step 5: Student B can now acquire the freed lock
  console.log("Step 5: Student B acquiring freed lock...");
  const tokenB2 = await acquireMentorLock(testMentorId, studentB, {
    ttlSeconds: 10,
    retryCount: 0,
  });

  if (!tokenB2) {
    console.error("Failed: Student B could not acquire freed lock!");
    process.exit(1);
  }
  console.log("Success: Student B acquired freed lock with token:", tokenB2);

  // Step 6: Test Auto-TTL expiration
  console.log("Step 6: Testing Auto-TTL expiration (1s TTL)...");
  await releaseMentorLock(testMentorId, tokenB2);

  const tokenC = await acquireMentorLock(testMentorId, "student_charlie", {
    ttlSeconds: 1,
    retryCount: 0,
  });
  console.log("Student Charlie acquired 1s lock with token:", tokenC, "- waiting 1.5s for auto-expiration...");
  await new Promise((r) => setTimeout(r, 1500));

  // Student D should now be able to acquire lock without any explicit release
  const tokenD = await acquireMentorLock(testMentorId, "student_dan", {
    ttlSeconds: 5,
    retryCount: 0,
  });

  if (!tokenD) {
    console.error("Failed: Auto-TTL expiration did not unlock the key!");
    process.exit(1);
  }
  console.log("Success: Auto-TTL successfully freed the lock automatically!");

  // Cleanup
  await releaseMentorLock(testMentorId, tokenD);
  console.log("=== All Redis Mentor Lock Tests Passed Successfully! ===");
  process.exit(0);
}

runTest().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
