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
    // =============== GET ALL USERS ===============
    if (method === "GET") {
      const file = await getFile("users.json");
      return res.status(200).json(file.json);
    }

    // =============== ADD NEW USER ===============
    if (method === "POST") {
      const { username, password, role, expired, createdBy } = req.body;

      if (!username || !password) {
        return res.status(400).json({ success: false, message: "Data tidak lengkap" });
      }

      const { sha, json } = await getFile("users.json");

      if (json.find(u => u.username === username)) {
        return res.status(400).json({ success: false, message: "Username sudah dipakai" });
      }

      const newUser = {
        username,
        password,
        role: role || "reseller",
        expired: expired || "",
        createdBy: createdBy || "system",
      };

      json.push(newUser);

      await saveFile("users.json", json, sha);

      return res.status(200).json({
        success: true,
        data: json
      });
    }

    return res.status(405).json({ message: "Method not allowed" });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}