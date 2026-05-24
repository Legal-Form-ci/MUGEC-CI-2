import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";

import appCss from "../styles.css?url";


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "MUGEC-CI — Mutuelle Générale du Personnel des Collectivités Territoriales" },
      {
        name: "description",
        content:
          "Plateforme officielle de la MUGEC-CI : inscription en ligne, espace membre, cotisations et services aux agents des collectivités territoriales de Côte d'Ivoire.",
      },
      { name: "author", content: "MUGEC-CI" },
      { property: "og:title", content: "MUGEC-CI — Mutuelle Générale du Personnel des Collectivités Territoriales" },
      {
        property: "og:description",
        content: "Inscrivez-vous à la MUGEC-CI en ligne et accédez à votre espace membre sécurisé.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "MUGEC-CI — Mutuelle Générale du Personnel des Collectivités Territoriales" },
      { name: "description", content: "MUGEC-CI est une plateforme dédiée aux agents des collectivités territoriales, facilitant l’accès aux informations, services et démarches liés à la mutuelle." },
      { property: "og:description", content: "MUGEC-CI est une plateforme dédiée aux agents des collectivités territoriales, facilitant l’accès aux informations, services et démarches liés à la mutuelle." },
      { name: "twitter:description", content: "MUGEC-CI est une plateforme dédiée aux agents des collectivités territoriales, facilitant l’accès aux informations, services et démarches liés à la mutuelle." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/OI6nUHN0rMdlKjHmlXGUEQqHcM52/social-images/social-1779221804450-MUGEC-CI.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/OI6nUHN0rMdlKjHmlXGUEQqHcM52/social-images/social-1779221804450-MUGEC-CI.webp" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}

