import React from 'react';

export default function Sponsors() {
  return (
    <section className="py-8 px-8 lg:py-20">
      <div className="container mx-auto text-center">
        <h6 className="block antialiased tracking-normal font-sans text-base font-semibold leading-relaxed text-blue-gray-900 mb-8">SPONSORED BY</h6>
        <div className="flex flex-wrap items-center justify-center gap-6">
          <img alt="coinbase" className="w-40" src="/landing/logos/logo-coinbase.svg" />
          <img alt="spotify" className="w-40" src="/landing/logos/logo-spotify.svg" />
          <img alt="pinterest" className="w-40" src="/landing/logos/logo-pinterest.svg" />
          <img alt="google" className="w-40" src="/landing/logos/logo-google.svg" />
          <img alt="amazon" className="w-40" src="/landing/logos/logo-amazon.svg" />
          <img alt="netflix" className="w-40" src="/landing/logos/logo-netflix.svg" />
        </div>
      </div>
    </section>
  );
}
