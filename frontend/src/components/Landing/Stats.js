import React from 'react';

export default function Stats() {
  return (
    <section className="container mx-auto grid gap-10 px-8 py-44 lg:grid-cols-1 lg:gap-20 xl:grid-cols-2 xl:place-items-center">
      <div>
        <h6 className="text-orange-500 mb-6">Our Stats</h6>
        <p className="text-5xl font-bold text-blue-gray-900">Conference Highlights</p>
        <p className="text-xl text-gray-500 mt-3">This three-day extravaganza brings together the brightest minds, leading innovators, and top companies in the field of Artificial Intelligence.</p>
      </div>
      <div>
        <div className="grid grid-cols-2 gap-8 gap-x-28">
          <div>
            <h1 className="text-5xl font-bold">1,500+</h1>
            <h6 className="mt-1">Participants</h6>
          </div>
          <div>
            <h1 className="text-5xl font-bold">50</h1>
            <h6 className="mt-1">Speakers</h6>
          </div>
          <div>
            <h1 className="text-5xl font-bold">20+</h1>
            <h6 className="mt-1">Workshops</h6>
          </div>
          <div>
            <h1 className="text-5xl font-bold">3</h1>
            <h6 className="mt-1">Days</h6>
          </div>
        </div>
      </div>
    </section>
  );
}
