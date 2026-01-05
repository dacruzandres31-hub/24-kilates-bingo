const {z} = require("zod");
const s = z.object({a: z.string()});
try {
  s.parse({a: 123});
} catch(e) {
  console.log("name: " + e.name);
  console.log("errors: " + JSON.stringify(e.errors));
}
