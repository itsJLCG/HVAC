import React from 'react';

export default function LandingHero() {
  const style = {
    backgroundImage: "url('/landing/image/event.jpeg')",
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
  };

  return (
    <div className="relative min-h-screen w-full" style={style}>
      <div className="absolute inset-0 h-full w-full bg-gray-900/60" />
      <div className="grid min-h-screen px-8">
        <div className="container relative z-10 my-auto mx-auto grid place-items-center text-center">
          <h3 className="block antialiased tracking-normal font-sans text-3xl font-semibold leading-snug text-white mb-2">29-31 August @ New York</h3>
          <h1 className="block antialiased tracking-normal font-sans text-5xl font-semibold leading-tight text-white lg:max-w-3xl">AI Conference 2023: Unlocking the Future</h1>
          <p className="block antialiased font-sans text-xl font-normal leading-relaxed text-white mt-1 mb-12 w-full md:max-w-full lg:max-w-2xl">Join us for the most anticipated event of the year - the AI Conference 2023!</p>
          <div className="flex items-center gap-4">
            <button className="align-middle select-none font-sans font-bold text-center uppercase text-xs py-3 px-6 rounded-lg bg-white text-blue-gray-900 shadow-md" type="button">Get started</button>
            <button className="relative align-middle w-10 max-w-[40px] h-10 max-h-[40px] text-xs text-white shadow-md rounded-full bg-white p-6" type="button">
              <span className="absolute top-1/2 left-1/2 transform -translate-y-1/2 -translate-x-1/2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-4 w-4 text-gray-900"><path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" /></svg>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
