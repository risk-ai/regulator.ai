# Add Environment Variable - Quick Instructions

## Option 1: Via Vercel Dashboard (Easiest - 2 minutes)

1. Go to: https://vercel.com/max-andersons-projects-6562eb7f/regulator.ai/settings/environment-variables

2. Click "Add New" (or add variable form)

3. Fill in:
   - **Key:** `VIENNA_RUNTIME_URL`
   - **Value:** `https://vienna-runtime-preview.fly.dev`
   - **Environments:** Check both "Preview" and "Development"

4. Click "Save"

**Done!** Proceed to deployment.

---

## Option 2: Via CLI (Interactive - 3 minutes)

Run this command **in your own terminal** (requires interactive prompts):

```bash
cd /home/maxlawai/regulator.ai
vercel env add VIENNA_RUNTIME_URL preview
```

**Prompts you'll see:**

1. `Add VIENNA_RUNTIME_URL to which Git branch?`
   - **Press Enter** (leave empty for all preview branches)

2. `What's the value of VIENNA_RUNTIME_URL?`
   - **Type:** `https://vienna-runtime-preview.fly.dev`
   - **Press Enter**

**Repeat for development:**

```bash
vercel env add VIENNA_RUNTIME_URL development
```

Same prompts, same answers.

---

## Verify

After adding via either method:

```bash
vercel env ls
```

Should show:
```
VIENNA_RUNTIME_URL (Preview, Development)
  https://vienna-runtime-preview.fly.dev
```

---

## Next Step

Once environment variable is added, we can trigger deployment!

Let me know when done and I'll continue.
