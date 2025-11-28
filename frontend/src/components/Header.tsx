/**
 * GiveCalc Header component with branding
 */

const LOGO_URL = "https://raw.githubusercontent.com/PolicyEngine/policyengine-app/master/src/images/logos/policyengine/white.png";

export default function Header() {
  return (
    <header className="bg-primary-700">
      <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-white tracking-tight">
              GiveCalc
            </h1>
            <a
              href="https://policyengine.org"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
            >
              <span className="text-sm text-white/90 font-medium">
                By
              </span>
              <img
                src={LOGO_URL}
                alt="PolicyEngine"
                className="h-5"
              />
            </a>
          </div>
          <p className="text-sm text-white/80 hidden sm:block">
            Calculate how charitable giving affects your taxes
          </p>
        </div>
      </div>
    </header>
  );
}
