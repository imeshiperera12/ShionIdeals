export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8 text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">ShionIdeals</h1>
        <p className="text-lg text-gray-600 mb-8">Welcome to ShionIdeals Shop Management System</p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Project Structure</h2>
          <p className="text-gray-700 mb-4">
            This project contains a React-based shop with an admin panel located in the{" "}
            <code className="bg-gray-200 px-2 py-1 rounded">/frontend</code> directory.
          </p>
          <div className="text-left space-y-2 text-sm text-gray-600">
            <p>
              <strong>User Pages:</strong> Homepage, Contact Us
            </p>
            <p>
              <strong>Admin Panel:</strong> Login, Dashboard, Selling, Buying, Revenue, Expenses
            </p>
            <p>
              <strong>Backend:</strong> Firebase (Firestore, Authentication, Storage)
            </p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Deployment Instructions</h2>
          <ol className="text-left space-y-2 text-sm text-gray-700">
            <li>
              1. Navigate to the <code className="bg-gray-200 px-2 py-1 rounded">frontend/</code> directory
            </li>
            <li>
              2. Install dependencies: <code className="bg-gray-200 px-2 py-1 rounded">npm install</code>
            </li>
            <li>
              3. Configure Firebase credentials in{" "}
              <code className="bg-gray-200 px-2 py-1 rounded">src/firebase.js</code>
            </li>
            <li>
              4. Run development server: <code className="bg-gray-200 px-2 py-1 rounded">npm start</code>
            </li>
            <li>
              5. Access admin panel at <code className="bg-gray-200 px-2 py-1 rounded">/admin</code>
            </li>
          </ol>
        </div>

        <div className="mt-6 text-sm text-gray-500">
          <p>Built with React, Firebase, Bootstrap, and Chart.js</p>
        </div>
      </div>
    </div>
  )
}
