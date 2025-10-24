"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listProjectsByClient = listProjectsByClient;
exports.getProject = getProject;
exports.createProject = createProject;
exports.updateProject = updateProject;
exports.deleteProject = deleteProject;
const prisma_js_1 = require("../lib/prisma.js");
const env_js_1 = require("../config/env.js");
function toPublic(p) {
    return {
        id: Number(p.id),
        clientId: Number(p.clientId),
        name: p.name,
        description: p.description ?? null,
        repoProvider: (p.repoProvider ?? null),
        repoUrl: p.repoUrl ?? null,
        repoOwner: p.repoOwner ?? null,
        repoName: p.repoName ?? null,
        defaultBranch: p.defaultBranch ?? null,
        liveUrl: p.liveUrl ?? null,
        healthUrl: p.healthUrl ?? null,
        lastRepoPushAt: p.lastRepoPushAt ?? null,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
    };
}
function detectProviderFromUrl(url) {
    if (!url)
        return null;
    try {
        const u = new URL(url);
        if (u.hostname.includes('github.com'))
            return 'GITHUB';
        if (u.hostname.includes('gitlab.com'))
            return 'GITLAB';
        return 'OTHER';
    }
    catch {
        return null;
    }
}
function parseRepoFromUrl(url) {
    if (!url)
        return {};
    try {
        const u = new URL(url);
        // Expect: /owner/name or /group/subgroup/name
        const parts = u.pathname.split('/').filter(Boolean);
        if (parts.length >= 2) {
            const name = parts[parts.length - 1].replace(/\.git$/, '');
            const owner = parts.slice(0, parts.length - 1).join('/');
            return { owner, name, fullPath: `${owner}/${name}` };
        }
    }
    catch {
        // ignore
    }
    return {};
}
async function fetchGithubMeta(owner, repo) {
    if (!owner || !repo)
        return null;
    const token = env_js_1.env.GITHUB_TOKEN;
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
    const res = await fetch(url, {
        headers: {
            'Accept': 'application/vnd.github+json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'User-Agent': 'DoubledBack/1.0',
        },
    });
    if (!res.ok)
        return null;
    const data = await res.json();
    return { html_url: data.html_url, pushed_at: data.pushed_at };
}
async function fetchGitlabMeta(fullPath) {
    if (!fullPath)
        return null;
    const token = env_js_1.env.GITLAB_TOKEN;
    const url = `https://gitlab.com/api/v4/projects/${encodeURIComponent(fullPath)}`;
    const res = await fetch(url, {
        headers: {
            'Accept': 'application/json',
            ...(token ? { 'PRIVATE-TOKEN': token } : {}),
        },
    });
    if (!res.ok)
        return null;
    const data = await res.json();
    return { web_url: data.web_url, last_activity_at: data.last_activity_at };
}
async function checkOnline(url, timeoutMs = 3000) {
    if (!url)
        return { online: false };
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { method: 'HEAD', redirect: 'manual', signal: controller.signal });
        clearTimeout(to);
        if (res.ok)
            return { online: true, status: res.status };
        // Retry with GET for some hosts not supporting HEAD
        const resGet = await fetch(url, { method: 'GET', redirect: 'manual', signal: controller.signal });
        return { online: resGet.ok, status: resGet.status };
    }
    catch {
        clearTimeout(to);
        return { online: false };
    }
}
async function withMeta(p) {
    const provider = (p.repoProvider ?? detectProviderFromUrl(p.repoUrl)) || null;
    let repoHtmlUrl;
    let repoLastPushAt;
    if (provider === 'GITHUB') {
        const { owner, name } = p.repoOwner && p.repoName ? { owner: p.repoOwner, name: p.repoName } : parseRepoFromUrl(p.repoUrl);
        const meta = await fetchGithubMeta(owner, name);
        repoHtmlUrl = meta?.html_url;
        repoLastPushAt = meta?.pushed_at ?? null;
    }
    else if (provider === 'GITLAB') {
        const { fullPath } = p.repoOwner && p.repoName ? { fullPath: `${p.repoOwner}/${p.repoName}` } : parseRepoFromUrl(p.repoUrl);
        const meta = await fetchGitlabMeta(fullPath);
        repoHtmlUrl = meta?.web_url;
        repoLastPushAt = meta?.last_activity_at ?? null;
    }
    else {
        repoHtmlUrl = p.repoUrl ?? null;
        repoLastPushAt = p.lastRepoPushAt ? p.lastRepoPushAt.toISOString() : null;
    }
    const onlineCheckUrl = p.healthUrl ?? p.liveUrl ?? undefined;
    const onlineInfo = await checkOnline(onlineCheckUrl);
    const meta = {
        repoHtmlUrl: repoHtmlUrl ?? null,
        repoLastPushAt: repoLastPushAt ?? null,
        online: onlineInfo.online,
        onlineStatus: onlineInfo.status ?? null,
        onlineCheckedAt: new Date().toISOString(),
    };
    return { ...p, meta };
}
async function listProjectsByClient(userId, clientId, opts) {
    const uid = BigInt(userId);
    const cid = BigInt(clientId);
    // ensure ownership
    const client = await prisma_js_1.prisma.client.findFirst({ where: { id: cid, ownerId: uid } });
    if (!client)
        throw Object.assign(new Error('Client introuvable'), { status: 404 });
    const projects = await prisma_js_1.prisma.project.findMany({ where: { clientId: cid }, orderBy: { createdAt: 'desc' } });
    const pub = projects.map(toPublic);
    if (opts?.includeMeta !== false) {
        const withMetas = await Promise.all(pub.map(withMeta));
        return withMetas;
    }
    return pub;
}
async function getProject(userId, id, opts) {
    const uid = BigInt(userId);
    const pid = BigInt(id);
    const p = await prisma_js_1.prisma.project.findFirst({ where: { id: pid, client: { ownerId: uid } } });
    if (!p)
        throw Object.assign(new Error('Projet introuvable'), { status: 404 });
    const pub = toPublic(p);
    if (opts?.includeMeta === false)
        return pub;
    return await withMeta(pub);
}
async function createProject(userId, clientId, data) {
    const uid = BigInt(userId);
    const cid = BigInt(clientId);
    const client = await prisma_js_1.prisma.client.findFirst({ where: { id: cid, ownerId: uid } });
    if (!client)
        throw Object.assign(new Error('Client introuvable'), { status: 404 });
    const provider = data.repoProvider ?? detectProviderFromUrl(data.repoUrl) ?? null;
    const created = await prisma_js_1.prisma.project.create({
        data: {
            clientId: cid,
            name: data.name,
            description: data.description,
            repoProvider: provider,
            repoUrl: data.repoUrl,
            repoOwner: data.repoOwner,
            repoName: data.repoName,
            defaultBranch: data.defaultBranch,
            liveUrl: data.liveUrl,
            healthUrl: data.healthUrl,
        },
    });
    return toPublic(created);
}
async function updateProject(userId, id, data) {
    const uid = BigInt(userId);
    const pid = BigInt(id);
    const exists = await prisma_js_1.prisma.project.findFirst({ where: { id: pid, client: { ownerId: uid } } });
    if (!exists)
        throw Object.assign(new Error('Projet introuvable'), { status: 404 });
    const provider = data.repoProvider ?? detectProviderFromUrl(data.repoUrl ?? exists.repoUrl) ?? undefined;
    const updated = await prisma_js_1.prisma.project.update({
        where: { id: pid },
        data: {
            name: data.name,
            description: data.description,
            repoProvider: provider,
            repoUrl: data.repoUrl,
            repoOwner: data.repoOwner,
            repoName: data.repoName,
            defaultBranch: data.defaultBranch,
            liveUrl: data.liveUrl,
            healthUrl: data.healthUrl,
        },
    });
    return toPublic(updated);
}
async function deleteProject(userId, id) {
    const uid = BigInt(userId);
    const pid = BigInt(id);
    const del = await prisma_js_1.prisma.project.deleteMany({ where: { id: pid, client: { ownerId: uid } } });
    if (del.count === 0)
        throw Object.assign(new Error('Projet introuvable'), { status: 404 });
}
