import React from 'react';

export default function FAQ() {
  return (
    <section className="py-8 px-8 lg:py-20">
      <div className="container mx-auto">
        <div className="text-center">
          <h1 className="text-5xl font-semibold text-blue-gray-900 mb-4">Frequently asked questions</h1>
          <p className="text-xl text-gray-500 mx-auto mb-24 lg:w-3/5">Welcome to the AI Conference 2023 FAQ section. We're here to address your most common queries and provide you with the information you need to make the most of your conference experience.</p>
        </div>

        <div className="mx-auto lg:max-w-screen-lg lg:px-20">
          <div className="block relative w-full">
            <button type="button" className="flex justify-between items-center w-full py-4 border-b border-b-blue-gray-100 text-xl font-semibold select-none text-left text-gray-900">1. How do I register for the AI Conference 2023?<span className="ml-4">+</span></button>
            <div className="overflow-hidden"><div className="py-4 text-gray-700">You can register for the AI Conference 2023 by visiting our registration page. Follow the simple steps to complete your registration and secure your spot at the conference.</div></div>
          </div>
          <div className="block relative w-full">
            <button type="button" className="flex justify-between items-center w-full py-4 border-b border-b-blue-gray-100 text-xl font-semibold select-none text-left text-gray-900">2. What are the registration fees, and what is included?<span className="ml-4">+</span></button>
            <div className="overflow-hidden"><div className="py-4 text-gray-700">Registration fees vary depending on ticket type. See the registration page for details.</div></div>
          </div>
          <div className="block relative w-full">
            <button type="button" className="flex justify-between items-center w-full py-4 border-b border-b-blue-gray-100 text-xl font-semibold select-none text-left text-gray-900">3. Can I get a refund if I need to cancel my registration?<span className="ml-4">+</span></button>
            <div className="overflow-hidden"><div className="py-4 text-gray-700">Refund policy is available on the registration page; typically refunds are processed within 14 days.</div></div>
          </div>
        </div>
      </div>
    </section>
  );
}
