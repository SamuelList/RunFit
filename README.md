# GitHub Codespaces ♥️ React

Welcome to your shiny new Codespace running React! We've got everything fired up and running for you to explore React.

You've got a blank canvas to work on from a git perspective as well. There's a single initial commit with the what you're seeing right now - where you go from here is up to you!

Everything you do here is contained within this one codespace. There is no repository on GitHub yet. If and when you’re ready you can click "Publish Branch" and we’ll create your repository and push up your project. If you were just exploring then and have no further need for this code then you can simply delete your codespace and it's gone forever.

This project was bootstrapped for you with [Vite](https://vitejs.dev/).

## Available Scripts

In the project directory, you can run:

### `npm start`

We've already run this for you in the `Codespaces: server` terminal window below. If you need to stop the server for any reason you can just run `npm start` again to bring it back online.

Runs the app in the development mode.\
Open [http://localhost:3000/](http://localhost:3000/) in the built-in Simple Browser (`Cmd/Ctrl + Shift + P > Simple Browser: Show`) to view your running application.

The page will reload automatically when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

## Learn More

You can learn more in the [Vite documentation](https://vitejs.dev/guide/).

To learn Vitest, a Vite-native testing framework, go to [Vitest documentation](https://vitest.dev/guide/)

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://sambitsahoo.com/blog/vite-code-splitting-that-works.html](https://sambitsahoo.com/blog/vite-code-splitting-that-works.html)

### Analyzing the Bundle Size

This section has moved here: [https://github.com/btd/rollup-plugin-visualizer#rollup-plugin-visualizer](https://github.com/btd/rollup-plugin-visualizer#rollup-plugin-visualizer)

### Making a Progressive Web App

This section has moved here: [https://dev.to/hamdankhan364/simplifying-progressive-web-app-pwa-development-with-vite-a-beginners-guide-38cf](https://dev.to/hamdankhan364/simplifying-progressive-web-app-pwa-development-with-vite-a-beginners-guide-38cf)

### Advanced Configuration

This section has moved here: [https://vitejs.dev/guide/build.html#advanced-base-options](https://vitejs.dev/guide/build.html#advanced-base-options)

### Deployment

This section has moved here: [https://vitejs.dev/guide/build.html](https://vitejs.dev/guide/build.html)

## Environment Variables

This app uses environment variables for API configuration. Create a `.env` file in the root directory:

The app now defaults to using a server-side proxy for Gemini calls so your
API key is never exposed in the browser. There are two parts:

1) Server (recommended, required for production)

 - Run the small Express server in `server/` (or deploy it to Cloud Run).
 - Provide your server-side key as `GEMINI_API_KEY` (see `server/.env.example`).
 - The server exposes POST `/api/generate-gear` and enforces cooldowns.

2) Client

 - In the client `.env` enable the proxy with:

```bash
VITE_USE_PROXY=true
```

 - Do NOT set `VITE_GEMINI_API_KEY` in production. If you set it, the client
    will attempt to call Gemini directly (not recommended).

Get your Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

### Netlify / Vercel Deployment (recommended approach)

When deploying, DO NOT inject your Gemini API key into the client bundle. Instead:

1. Deploy the server component (Cloud Run, VM, or a small server) and set `GEMINI_API_KEY` there.
2. Deploy the client to Netlify/Vercel and set `VITE_USE_PROXY=true` in the site's environment variables.
3. Ensure the client can reach the server proxy (CORS / networking) and that `/api/generate-gear` is routed to the server.

If you must keep everything serverless on Netlify or Vercel functions, implement the same server-side handler as shown in `server/index.js` as a function and configure the function's environment variables with your `GEMINI_API_KEY`.

### Troubleshooting

This section has moved here: [https://vitejs.dev/guide/troubleshooting.html](https://vitejs.dev/guide/troubleshooting.html)
