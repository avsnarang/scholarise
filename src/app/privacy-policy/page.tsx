"use client";

import React from "react";
import Image from "next/image";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-4">
            <Image
              src="/mobile_logo.png"
              alt="Logo"
              width={48}
              height={48}
              className="object-contain"
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Privacy Policy
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                The Scholars' Home - Education Management System
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <div className="prose dark:prose-invert max-w-none">
            
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Privacy Statement
            </h2>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              This Privacy Policy discloses the privacy practices for The Scholars' Home Education Management System. 
              As a general rule, this system does not collect Personal Information ("Personal Information" in this 
              privacy statement refers to any information from which your identity is apparent or can be reasonably 
              ascertained) about you (like name, phone number or e-mail address), that allows us to identify you 
              individually when you visit this website, unless you choose to provide such information.
            </p>

            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Users of this system are guaranteed privacy. Information collected on this platform is kept private 
              and never shared with unauthorized organizations. This privacy statement is to inform you about the 
              types of information gathered and how it is handled on the system.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Information Collection and Use
            </h3>
            
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Our education management system records your usage and logs the following information for 
              administrative and security purposes:
            </p>
            
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-6 space-y-2">
              <li>Your server's address and IP location</li>
              <li>The type of browser and device you use</li>
              <li>The date and time you access this system</li>
              <li>The pages you have accessed and actions performed</li>
              <li>Previous internet address from which you linked to the system</li>
            </ul>

            <p className="text-gray-700 dark:text-gray-300 mb-6">
              We will not identify users or their activities, except when required by law enforcement 
              agencies with proper authorization or for security breach investigations.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Data Analytics and System Administration
            </h3>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Your Internet Protocol (IP) address is used to gather broad usage statistics and system 
              performance metrics. We log IP addresses and browser types for systems administration 
              purposes. These logs are analyzed to improve the functionality and security of the platform. 
              IP addresses do not provide us with personally identifiable information unless linked to 
              your user account.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              External Links and Third-Party Services
            </h3>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              This system may contain links to external educational resources and third-party services. 
              Scholarise is not responsible for the privacy practices or content of such external sites. 
              When you click on external links, you leave our system and should review the privacy 
              policies of those sites.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Email and Communication Management
            </h3>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Your email address and contact information will only be used for official educational 
              communications related to your enrollment, academic progress, and administrative purposes. 
              We do not utilize commercial marketing services, and your information will never be used 
              for solicitation. Your contact information will not be disclosed without your consent, 
              except as required by educational regulations or law.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Student and Staff Data Protection
            </h3>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              This system collects and processes educational data including academic records, attendance, 
              assessment results, and administrative information. This data is essential for educational 
              operations and is protected under educational privacy regulations. Access to this information 
              is restricted to authorized educational personnel only.
            </p>

            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Adequate security measures are implemented to protect all personal and educational information. 
              Access is controlled and monitored by authorized system administrators. We do not sell or 
              share any personally identifiable information with unauthorized third parties.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Payment and Financial Information
            </h3>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              The Scholars' Home uses secure payment processing services, including Razorpay Payment Gateway, 
              to handle fee payments and financial transactions. When you make payments through our system:
            </p>

            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-6 space-y-2">
              <li>Your payment information is processed through PCI DSS compliant payment gateways</li>
              <li>We do not store your complete credit card or debit card information on our servers</li>
              <li>Payment data is encrypted using industry-standard security protocols</li>
              <li>Transaction records are maintained for accounting and regulatory compliance</li>
              <li>Payment information may be shared with authorized payment processors and financial institutions</li>
            </ul>

            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Payment transaction data including amount, date, payment method, and transaction status is 
              stored securely for fee management, refund processing, and financial reporting purposes. 
              This information is accessed only by authorized financial and administrative staff.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Third-Party Payment Services
            </h3>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              We use Razorpay and other authorized payment gateways to process payments. These services 
              have their own privacy policies and terms of service. When you make a payment, you will 
              be redirected to the payment gateway's secure servers. Please review their privacy policies 
              to understand how they handle your payment information.
            </p>

            <p className="text-gray-700 dark:text-gray-300 mb-6">
              The Scholars' Home is not responsible for the privacy practices of third-party payment 
              processors, but we only work with reputable, secure, and compliant payment service providers.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Data Security and Protection
            </h3>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              This education management system complies with industry standards and educational data 
              protection regulations. We have security measures in place to protect against loss, 
              misuse, and alteration of information under our control:
            </p>

            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-6 space-y-2">
              <li>Encrypted data transmission and storage</li>
              <li>Regular security monitoring and threat detection</li>
              <li>Access controls and user authentication systems</li>
              <li>Regular data backups and disaster recovery procedures</li>
              <li>Compliance with educational data protection standards</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Data Retention and Access Rights
            </h3>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Educational data is retained according to institutional policies and regulatory requirements. 
              Students and staff have the right to access their personal information stored in the system 
              and may request corrections to inaccurate data through official channels.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Changes to Privacy Policy
            </h3>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              We reserve the right to modify this privacy policy. Users will be notified of significant 
              changes through official communication channels. Continued use of the system after changes 
              indicates acceptance of the updated policy.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Contact Information
            </h3>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              If you have questions about this privacy policy, concerns about your data, or issues related 
              to payment processing, please contact The Scholars' Home administration through the official 
              support channels provided in the system or visit our main office during business hours.
            </p>

            <p className="text-sm text-gray-500 dark:text-gray-400 mt-8 pt-4 border-t border-gray-200 dark:border-gray-600">
              Last updated: January 2025
            </p>

          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <a 
              href="/sign-in" 
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
            >
              ← Back to Sign In
            </a>
            <a 
              href="/terms-and-conditions" 
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
            >
              Terms and Conditions →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}