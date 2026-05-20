import React from 'react';

export default function LandingFooter() {
  return (
    <footer className="pb-5 p-10 md:pt-10">
      <div className="container flex flex-col mx-auto">
        <div className="flex !w-full py-10 mb-5 md:mb-20 flex-col justify-center !items-center bg-gray-900 max-w-6xl mx-auto rounded-2xl p-5 ">
          <p className="text-white text-2xl md:text-3xl text-center font-bold">Join now and get 30% OFF!</p>
          <p className="text-base text-white md:w-7/12 text-center my-3">Don't miss out on this exclusive offer that will end soon.</p>
          <div className="flex w-full md:w-fit gap-3 mt-2 flex-col md:flex-row">
            <button className="py-3 px-6 rounded-lg bg-white text-blue-gray-900">buy ticket</button>
          </div>
        </div>
        <div className="flex flex-col md:flex-row items-center !justify-between">
          <a href="https://www.material-tailwind.com" target="_blank" rel="noreferrer" className="block text-gray-900">Material Tailwind</a>
          <ul className="flex justify-center my-4 md:my-0 w-max mx-auto items-center gap-4">
            <li><a href="#" className="text-sm text-gray-700">Company</a></li>
            <li><a href="#" className="text-sm text-gray-700">About Us</a></li>
            <li><a href="#" className="text-sm text-gray-700">Team</a></li>
            <li><a href="#" className="text-sm text-gray-700">Products</a></li>
            <li><a href="#" className="text-sm text-gray-700">Blog</a></li>
          </ul>
          <div className="flex w-fit justify-center gap-2">
            <button className="w-8 h-8 rounded-lg text-gray-900"><i className="fa-brands fa-twitter" /></button>
            <button className="w-8 h-8 rounded-lg text-gray-900"><i className="fa-brands fa-youtube" /></button>
            <button className="w-8 h-8 rounded-lg text-gray-900"><i className="fa-brands fa-instagram" /></button>
            <button className="w-8 h-8 rounded-lg text-gray-900"><i className="fa-brands fa-github" /></button>
          </div>
        </div>
        <p className="text-base text-blue-gray-900 text-center mt-12">© 2026 Made with <a href="https://www.material-tailwind.com" target="_blank" rel="noreferrer">Material Tailwind</a> by <a href="https://www.creative-tim.com" target="_blank" rel="noreferrer">Creative Tim</a>.</p>
      </div>
    </footer>
  );
}
