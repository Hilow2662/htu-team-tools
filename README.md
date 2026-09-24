# HTU Team Tools

Tools for the **Honolulu Tech Generals (HTU)**, my custom team in EA College Football 27 Team Builder.

## Tools

- **Uniform Builder** (`uniform-builder/`): preview helmet, jersey, pants, and sock color combinations on a flat vector player. You can save named combos, compare them side by side, and download any combo as a PNG.

## Changing team colors or info

Everything about the team (name, abbreviation, and the color palette) lives in **`shared/team.js`**. Every tool reads from that file, so if you change a color there, it changes everywhere.

To edit it on GitHub:
1. Open `shared/team.js` in your repository.
2. Click the pencil icon (Edit this file).
3. Change a `hex` value, like `"#00818A"`. Keep the quotes and the `#`.
4. Click **Commit changes**. The live site updates within a minute or two.

Uniform combos you already saved keep their own colors. Only the swatch buttons change when you edit the palette.

## Turning on the website (GitHub Pages)

You only do this once.

1. Go to your repository on github.com.
2. Click **Settings** (the gear tab near the top).
3. In the left sidebar, click **Pages**.
4. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
5. Under **Branch**, pick **main** and **/ (root)**, then click **Save**.
6. Wait a minute or two, then refresh the page. A box at the top will say
   **"Your site is live at https://YOUR-USERNAME.github.io/htu-team-tools/"**.
   Click that link. The Uniform Builder is linked from the home page.

Note: GitHub Pages is free for public repositories. If this repository is private, you need to make it public (Settings → General → Danger Zone → Change visibility) or have a paid GitHub plan.

## Where saved combos are kept

Saved combos are stored in your web browser. They stay after you refresh or close the browser, but they don't sync between devices or browsers. Clearing your browser's site data erases them. Download PNGs of combos you want to keep for good.

## Project layout

```
index.html              Home page that lists the tools
shared/team.js          Team info and color palette (shared by all tools)
shared/site.css         Shared look and feel
uniform-builder/        The Uniform Builder tool
.nojekyll               Tells GitHub Pages to serve the files as-is
```

To add a tool later, create a new folder with its own `index.html`. Load `../shared/team.js` and `../shared/site.css` in it, and add a link card to the home `index.html`.
