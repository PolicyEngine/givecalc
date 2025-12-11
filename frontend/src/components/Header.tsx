/**
 * GiveCalc Header component with refined PolicyEngine branding
 */

const LOGO_URL =
  "https://raw.githubusercontent.com/PolicyEngine/policyengine-app/master/src/images/logos/policyengine/white.png";

export default function Header() {
  return (
    <header className="relative bg-gradient-to-r from-primary-700 via-primary-600 to-primary-700 overflow-hidden">
      {/* Subtle pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Logo with refined typography */}
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              <span className="bg-clip-text">Give</span>
              <span className="font-normal opacity-90">Calc</span>
            </h1>

            {/* PolicyEngine badge */}
            <a
              href="https://policyengine.org"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full border border-white/10 hover:bg-white/20 hover:border-white/20 transition-all duration-200"
            >
              <span className="text-sm text-white/80 font-medium group-hover:text-white transition-colors">
                by
              </span>
              <img
                src={LOGO_URL}
                alt="PolicyEngine"
                className="h-5 opacity-90 group-hover:opacity-100 transition-opacity"
              />
            </a>
          </div>

          {/* Tagline with subtle animation */}
          <p className="text-sm text-white/70 hidden sm:block font-medium">
            Calculate how charitable giving affects your taxes
          </p>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </header>
  );
}
