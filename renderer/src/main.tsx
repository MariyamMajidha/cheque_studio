// path: renderer/src/main.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import {
  RouterProvider,
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import App from "./App";
import Templates from "./routes/Templates";
import Designer from "./routes/Designer";
import Cheques from "./routes/Cheques";
import Print from "./routes/Print";
import PrintPreview from "./routes/PrintPreview";
import Settings from "./routes/Settings";
import "./styles/tailwind.css";

const rootRoute = createRootRoute({
  component: () => <App />,
});

const routeTemplates = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Templates,
});
const routeDesigner = createRoute({
  getParentRoute: () => rootRoute,
  path: "/designer/$templateId",
  component: Designer,
});
const routeCheques = createRoute({
  getParentRoute: () => rootRoute,
  path: "/cheques",
  component: Cheques,
});
const routePrint = createRoute({
  getParentRoute: () => rootRoute,
  path: "/print",
  component: Print,
});
const routePrintPreview = createRoute({
  getParentRoute: () => rootRoute,
  path: "/print/preview",
  component: PrintPreview,
});
const routeSettings = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: Settings,
});

const router = createRouter({
  routeTree: rootRoute.addChildren([
    routeTemplates,
    routeDesigner,
    routeCheques,
    routePrint,
    routePrintPreview,
    routeSettings,
  ]),
  history: createHashHistory(),
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />
);
