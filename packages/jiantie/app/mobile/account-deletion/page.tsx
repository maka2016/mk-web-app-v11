'use client';

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Mail,
  Shield,
  Trash2,
  UserX,
} from 'lucide-react';

export default function AccountDeletionPage() {
  return (
    <div className="min-h-dvh bg-gray-50">

      <div className="px-5 py-6 space-y-6">
        {/* App Info */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-sm">
            <UserX className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">
            Account Deletion
          </h1>

        </div>

        {/* Steps Section */}
        <section className="bg-white rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-gray-900">
              How to Request Account Deletion
            </h2>
          </div>

          <div className="space-y-4">
            <StepItem
              step={1}
              title="Open the App"
              description='Launch the Jiantie app and log in to the account you wish to delete.'
            />
            <StepItem
              step={2}
              title="Go to Account Settings"
              description='Navigate to "My" tab → tap "Settings" → tap "Account & Security".'
            />
            <StepItem
              step={3}
              title="Request Deletion"
              description='Tap "Delete Account" and follow the on-screen instructions to confirm your request.'
            />

            <StepItem
              step={4}
              title="Confirm Deletion"
              description="Review the deletion details and confirm. Your account will enter a cooling-off period before permanent deletion."
            />
          </div>

          <div className="flex items-start gap-2 bg-blue-50 rounded-lg p-3">
            <Mail className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700">
              You can also request account deletion by sending an email to{' '}
              <a
                href="mailto:support@maka.im"
                className="font-medium underline"
              >
                support@maka.im
              </a>{' '}
              with the subject line &quot;Account Deletion Request&quot; and your registered phone number or email address.
            </p>
          </div>
        </section>

        {/* Data Deletion Section */}
        <section className="bg-white rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-500" />
            <h2 className="text-base font-semibold text-gray-900">
              Data That Will Be Deleted
            </h2>
          </div>

          <p className="text-sm text-gray-600">
            Upon account deletion, the following data will be{' '}
            <span className="font-medium text-red-600">permanently deleted</span> and
            cannot be recovered:
          </p>

          <ul className="space-y-2.5">
            <DataItem text="Personal profile information (name, avatar, bio)" />
            <DataItem text="Login credentials (phone number, email, third-party bindings)" />
            <DataItem text="Created works, designs, and templates" />
            <DataItem text="Favorites, collections, and browsing history" />
            <DataItem text="RSVP data, invitation records, and guest lists" />
            <DataItem text="In-app messages and notifications" />
          </ul>
        </section>

        {/* Data Retention Section */}
        <section className="bg-white rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-semibold text-gray-900">
              Data That May Be Retained
            </h2>
          </div>

          <p className="text-sm text-gray-600">
            Certain data may be retained for a limited period as required by law or for
            legitimate business purposes:
          </p>

          <ul className="space-y-3">
            <RetentionItem
              title="Transaction & Payment Records"
              description="Retained for up to 3 years after deletion to comply with financial regulations and tax laws."
            />
            <RetentionItem
              title="Legal Compliance Data"
              description="Data required by applicable laws (e.g., anti-fraud, dispute resolution) may be retained for up to 3 years."
            />
            <RetentionItem
              title="Anonymized Analytics Data"
              description="Aggregated, non-identifiable usage statistics may be retained indefinitely for service improvement."
            />
          </ul>
        </section>

        {/* Cooling-off Period */}
        <section className="bg-white rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-semibold text-gray-900">
              Important Notice
            </h2>
          </div>

          <div className="space-y-2 text-sm text-gray-600">
            <p>
              <span className="font-medium text-gray-900">Cooling-off Period:</span>{' '}
              After you submit a deletion request, there is a{' '}
              <span className="font-medium">15-day cooling-off period</span>. During
              this time, you can cancel the deletion by logging back into your account.
            </p>
            <p>
              <span className="font-medium text-gray-900">Processing Time:</span>{' '}
              After the cooling-off period, your account and associated data will be
              permanently deleted within{' '}
              <span className="font-medium">30 business days</span>.
            </p>
            <p>
              <span className="font-medium text-gray-900">VIP Subscription:</span>{' '}
              If you have an active subscription, please cancel it before requesting
              account deletion. Unused subscription time will not be refunded after
              account deletion.
            </p>
          </div>
        </section>

        {/* Contact Section */}
        <section className="bg-white rounded-xl p-5 shadow-sm space-y-3">
          <h2 className="text-base font-semibold text-gray-900">Contact Us</h2>
          <p className="text-sm text-gray-600">
            If you have any questions about account deletion, please contact us:
          </p>
          <div className="space-y-1.5 text-sm text-gray-700">
            <p>
              Email:{' '}
              <a
                href="mailto:support@jiantieapp.com"
                className="text-primary font-medium"
              >
                support@maka.im
              </a>
            </p>

          </div>
        </section>


      </div>
    </div>
  );
}

function StepItem({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-btn text-xs font-semibold shrink-0 mt-0.5">
        {step}
      </div>
      <div className="space-y-0.5">
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </div>
  );
}

function DataItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle2 className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
      <span className="text-sm text-gray-700">{text}</span>
    </li>
  );
}

function RetentionItem({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <li className="flex items-start gap-2">
      <Clock className="w-3.5 h-3.5 text-amber-400 mt-1 shrink-0" />
      <div>
        <span className="text-sm font-medium text-gray-800">{title}</span>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </li>
  );
}
