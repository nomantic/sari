import { AwsClient } from "aws4fetch";

const client = new AwsClient({
  accessKeyId: "testaccesskey",
  secretAccessKey: "testsecretkey",
  service: "s3",
  region: "auto",
});

const res = await client.fetch("http://127.0.0.1:4599/sari/sari/news.json");
const text = await res.text();
console.log("HTTP", res.status, "bytes", Buffer.byteLength(text, "utf8"));

const parsed = JSON.parse(text);
for (const post of parsed.posts.slice(0, 4)) {
  console.log("---");
  console.log("title:", JSON.stringify(post.title));
  console.log("bytes:", Buffer.from(post.title, "utf8").toString("hex").slice(0, 80));
  console.log("author:", JSON.stringify(post.author));
}
