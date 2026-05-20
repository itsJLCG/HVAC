import React from 'react';

export default function Features() {
  return (
    <section className="container mx-auto flex flex-col items-center px-4 py-10">
      <h6 className="block antialiased tracking-normal font-sans text-base font-semibold leading-relaxed text-orange-500 text-center mb-2">About the event</h6>
      <h3 className="block antialiased tracking-normal font-sans text-3xl font-semibold leading-snug text-blue-gray-900 text-center">Why Attend?</h3>
      <p className="block antialiased font-sans text-xl leading-relaxed text-inherit mt-2 lg:max-w-4xl mb-8 w-full text-center font-normal text-gray-500">Welcome to the AI Conference 2023, where the future unfolds! Whether you're a seasoned AI professional, a curious newcomer, or a business leader looking to harness the power of AI, this conference is designed to inspire, educate, and connect.</p>
      <div className="mt-8 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative flex flex-col bg-clip-border rounded-xl bg-white text-gray-700">
          <div className="h-[453px] p-5 flex flex-col justify-center items-center rounded-2xl bg-gray-900">
            <h6 className="text-white mb-4 text-center">Presentation</h6>
            <h4 className="text-white text-2xl mb-2 text-center">Cutting-Edge Insights!</h4>
            <p className="text-white mt-2 mb-10 text-base w-full lg:w-8/12 text-center">Gain deep insights into the latest AI trends, developments, and applications that are reshaping industries worldwide.</p>
            <button className="py-2 px-4 rounded-lg bg-white text-blue-gray-900">view details</button>
          </div>
        </div>

        <div className="relative flex flex-col bg-clip-border rounded-xl bg-white text-gray-700">
          <div className="h-[453px] p-5 flex flex-col justify-center items-center rounded-2xl bg-gray-900">
            <h6 className="text-white mb-4 text-center">Workshops</h6>
            <h4 className="text-white text-2xl mb-2 text-center">Practical Knowledge!</h4>
            <p className="text-white mt-2 mb-10 text-base w-full lg:w-8/12 text-center">Attend workshops and hands-on sessions to acquire practical skills that you can apply immediately.</p>
            <button className="py-2 px-4 rounded-lg bg-white text-blue-gray-900">view details</button>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="relative flex flex-col bg-clip-border rounded-xl bg-white text-gray-700">
            <div className="h-[453px] p-5 flex flex-col justify-center items-center rounded-2xl bg-gray-900">
              <h6 className="text-white mb-4 text-center">Community</h6>
              <h4 className="text-white text-2xl mb-2 text-center">Networking!</h4>
              <p className="text-white mt-2 mb-10 text-base w-full lg:w-8/12 text-center">Connect with industry leaders, AI experts, and fellow enthusiasts to build valuable professional relationships.</p>
              <button className="py-2 px-4 rounded-lg bg-white text-blue-gray-900">view details</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
