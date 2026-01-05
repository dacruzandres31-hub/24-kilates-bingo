const {z} = require("zod");
const s = z.object({
  username: z.string().min(3),
  password: z.string().min(4)
});

// Test valid
try {
  const result = s.parse({username: "admin", password: "Admin123!"});
  console.log("Valid parse result:", result);
} catch(e) {
  console.log("Error name:", e.name);
  console.log("Error issues:", e.issues);
  console.log("Error errors:", e.errors);
  console.log("Error keys:", Object.keys(e));
}

// Test invalid
try {
  s.parse({username: "ab", password: "123"});
} catch(e) {
  console.log("\nInvalid parse:");
  console.log("Error name:", e.name);
  console.log("Error issues:", e.issues);
  console.log("Error errors:", e.errors);
}
