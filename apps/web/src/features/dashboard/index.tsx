import { Header } from '#/components/layout/header';
import { Main } from '#/components/layout/main';
import { ProfileDropdown } from '#/components/profile-dropdown';
import { Search } from '#/components/search';
import { ThemeSwitch } from '#/components/theme-switch';
import { useCompanyContext } from '#/context/company-context';

export default function Dashboard() {
  const { currentCompany } = useCompanyContext();

  return (
    <>
      <Header fixed>
        <Search />
        <div className="ml-auto flex items-center space-x-4">
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className="mb-2 flex flex-wrap items-center justify-between space-y-2 gap-x-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">
              {currentCompany
                ? `Welcome to ${currentCompany.name}`
                : 'Welcome! Your dashboard is ready.'}
            </p>
          </div>
        </div>
        <div className="-mx-4 flex-1 overflow-auto px-4 py-1">
          {/* Dashboard content will go here */}
          <div className="flex items-center justify-center h-[400px] rounded-lg border border-dashed">
            <p className="text-muted-foreground">
              {currentCompany
                ? 'Company dashboard content coming soon...'
                : 'Dashboard content coming soon...'}
            </p>
          </div>
        </div>
      </Main>
    </>
  );
}