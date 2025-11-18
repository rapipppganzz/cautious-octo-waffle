import { Octokit } from "@octokit/core";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const owner = process.env.GITHUB_OWNER;
const repo = process.env.GITHUB_REPO;
const branch = process.env.GITHUB_BRANCH || "main";

async function getFile(path) {
  const res = await octokit.request(
    "GET /repos/{owner}/{repo}/contents/{path}",
    { owner, repo, path }
  );

  const content = Buffer.from(res.data.content, "base64").toString();
  return {
    sha: res.data.sha,
    json: JSON.parse(content),
  };
}

async function saveFile(path, data, sha) {
  return await octokit.request(
    "PUT /repos/{owner}/{repo}/contents/{path}",
    {
      owner,
      repo,
      path,
      message: `update ${path}`,
      content: Buffer.from(JSON.stringify(data, null, 2)).toString("base64"),
      sha,
      branch,
    }
  );
}

export default async function handler(req, res) {
  const method = req.method;

  try {
    // =============== GET ALL NUMBERS ===============
    if (method === "GET") {
      const file = await getFile("numbers.json");
      return res.status(200).json(file.json);
    }

    // =============== ADD NEW NUMBER ===============
    if (method === "POST") {
      const { number, addedBy } = req.body;

      if (!number) {
        return res.status(400).json({ success: false, message: "Nomor kosong" });
      }

      const { sha, json } = await getFile("numbers.json");

      if (json.includes(number)) {
        return res.status(400).json({ success: false, message: "Nomor sudah ada" });
      }

      json.push(number);

      await saveFile("numbers.json", json, sha);

      return res.status(200).json({
        success: true,
        data: json
      });
    }

    // =============== DELETE NUMBER ===============
    if (method === "DELETE") {
      const { index } = req.body;

      const { sha, json } = await getFile("numbers.json");

      if (index < 0 || index >= json.length) {
        return res.status(400).json({ success: false, message: "Index invalid" });
      }

      json.splice(index, 1);

      await saveFile("numbers.json", json, sha);

      return res.status(200).json({
        success: true,
        data: json
      });
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}