const port = process.env.ASK_CONTROL_PORT ?? "8791";
const response = await fetch(`http://127.0.0.1:${port}/reset-quota`, { method: "POST" });
const text = await response.text();
if (!response.ok) {
  console.error(text);
  process.exit(1);
}
console.log(text);
