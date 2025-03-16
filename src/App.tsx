import React from 'react';
import ImageSlider from './components/ImageSlider';
import { ImageIcon } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-md py-6 mb-8">
        <div className="max-w-4xl mx-auto px-4 flex items-center">
          <ImageIcon className="h-8 w-8 text-blue-500 mr-3" />
          <h1 className="text-3xl font-bold text-gray-800">Image Gallery</h1>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <ImageSlider />
      </main>
      
      <footer className="mt-12 bg-white border-t py-6">
        <div className="max-w-4xl mx-auto px-4 text-center text-gray-600">
          <p>© {new Date().getFullYear()} Image Gallery. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;