export default function Footer() {
  return (
    <footer className="bg-gray-700 text-gray-300 p-6 text-center mt-auto border-t border-gray-600">
      <div className="container mx-auto">
        <p className="text-xs">&copy; {new Date().getFullYear()} LangBridge. All rights reserved.</p>
      </div>
    </footer>
  );
}