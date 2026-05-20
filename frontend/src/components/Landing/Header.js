import React from 'react';

export default function LandingHeader() {
  return (
    <nav className="block py-4 w-full max-w-full rounded-none px-4 bg-transparent text-white shadow-none fixed top-0 z-50 border-0">
      <div className="container mx-auto flex items-center justify-between">
        <p className="block antialiased font-sans text-white text-lg font-bold">Material Tailwind</p>
        <ul className="ml-10 hidden items-center gap-6 lg:flex text-white">
          <li>
            <a href="#" className="antialiased font-sans text-base leading-relaxed text-inherit flex items-center gap-2 font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-5 w-5"><path d="M5.566 4.657A4.505 4.505 0 016.75 4.5h10.5c.41 0 .806.055 1.183.157A3 3 0 0015.75 3h-7.5a3 3 0 00-2.684 1.657zM2.25 12a3 3 0 013-3h13.5a3 3 0 013 3v6a3 3 0 01-3 3H5.25a3 3 0 01-3-3v-6zM5.25 7.5c-.41 0-.806.055-1.184.157A3 3 0 016.75 6h10.5a3 3 0 012.683 1.657A4.505 4.505 0 0018.75 7.5H5.25z" /></svg>
              <span>Page</span>
            </a>
          </li>
          <li>
            <a href="#" className="antialiased font-sans text-base leading-relaxed text-inherit flex items-center gap-2 font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-5 w-5"><path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" clipRule="evenodd" /></svg>
              <span>Account</span>
            </a>
          </li>
          <li>
            <a href="https://www.material-tailwind.com/docs/react/installation" target="_blank" rel="noreferrer" className="antialiased font-sans text-base leading-relaxed text-inherit flex items-center gap-2 font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-5 w-5"><path fillRule="evenodd" d="M2.25 6a3 3 0 013-3h13.5a3 3 0 013 3v12a3 3 0 01-3 3H5.25a3 3 0 01-3-3V6zm3.97.97a.75.75 0 011.06 0l2.25 2.25a.75.75 0 010 1.06l-2.25 2.25a.75.75 0 01-1.06-1.06l1.72-1.72-1.72-1.72a.75.75 0 010-1.06zm4.28 4.28a.75.75 0 000 1.5h3a.75.75 0 000-1.5h-3z" clipRule="evenodd" /></svg>
              <span>Docs</span>
            </a>
          </li>
        </ul>

        <div className="hidden items-center gap-4 lg:flex">
          <button className="align-middle select-none font-sans font-bold text-center uppercase text-xs py-3 px-6 rounded-lg text-white hover:bg-white/10" type="button">Log in</button>
          <a href="https://www.material-tailwind.com/blocks" target="_blank" rel="noreferrer">
            <button className="align-middle select-none font-sans font-bold text-xs py-3 px-6 rounded-lg bg-white text-blue-gray-900 shadow-md" type="button">blocks</button>
          </a>
        </div>

        <button className="relative align-middle w-10 max-w-[40px] h-10 max-h-[40px] rounded-lg text-xs text-white hover:bg-white/10 ml-auto inline-block lg:hidden" type="button">
          <span className="absolute top-1/2 left-1/2 transform -translate-y-1/2 -translate-x-1/2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" strokeWidth="2" className="h-6 w-6"><path fillRule="evenodd" d="M3 6.75A.75.75 0 013.75 6h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 6.75zM3 12a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 12zm0 5.25a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z" clipRule="evenodd" /></svg>
          </span>
        </button>
      </div>
    </nav>
  );
}
