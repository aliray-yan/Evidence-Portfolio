import { useMemo, useState, type FormEvent } from 'react';
import FormField from '../components/settings/FormField';
import SectionCard from '../components/settings/SectionCard';
import SelectField from '../components/settings/SelectField';
import SliderField from '../components/settings/SliderField';
import StatusBanner from '../components/settings/StatusBanner';
import ToggleField from '../components/settings/ToggleField';
import type { SettingsFormData, ValidationErrors } from '../types/settings';
import { isFormValid, validateSettings } from '../utils/validation';

const initialValues: SettingsFormData = {
  name: 'Alicia Chen',
  email: 'alicia@flyrank.com',
  defaultModel: 'gpt-4.1',
  creativity: 72,
  autoSuggestions: true,
  theme: 'system',
  emailAlerts: true,
  weeklyReports: false,
  twoFactorEnabled: true,
};

function SettingsPage() {
  const [values, setValues] = useState<SettingsFormData>(initialValues);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const validationErrors = useMemo(() => validateSettings(values), [values]);
  const formIsValid = isFormValid(validationErrors);

  const handleChange = <K extends keyof SettingsFormData>(field: K, value: SettingsFormData[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleFieldBlur = (field: 'name' | 'email') => {
    const nextErrors = validateSettings(values);
    setErrors(nextErrors);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateSettings(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setSuccessMessage('');
      return;
    }

    setIsSaving(true);
    setSuccessMessage('');

    await new Promise((resolve) => window.setTimeout(resolve, 800));

    setIsSaving(false);
    setSuccessMessage('Settings saved successfully.');
  };

  return (
    <main className="page-shell">
      <div className="page-shell__content">
        <header className="page-header">
          <div>
            <p className="eyebrow">FlyRank Dashboard</p>
            <h1>Settings</h1>
          </div>
          <button type="submit" form="settings-form" className="save-button" disabled={!formIsValid || isSaving}>
            {isSaving ? 'Saving…' : 'Save changes'}
          </button>
        </header>

        <form id="settings-form" className="settings-form" onSubmit={handleSubmit} noValidate>
          <SectionCard title="Account" description="Update your personal profile details.">
            <FormField
              id="name"
              label="Name"
              value={values.name}
              onChange={(value) => handleChange('name', value)}
              onBlur={() => handleFieldBlur('name')}
              error={errors.name ?? validationErrors.name}
              placeholder="Enter your name"
            />
            <FormField
              id="email"
              label="Email"
              value={values.email}
              onChange={(value) => handleChange('email', value)}
              onBlur={() => handleFieldBlur('email')}
              type="email"
              error={errors.email ?? validationErrors.email}
              placeholder="name@company.com"
            />
          </SectionCard>

          <SectionCard title="AI Preferences" description="Tune how FlyRank assists you.">
            <SelectField
              id="defaultModel"
              label="Default AI Model"
              value={values.defaultModel}
              onChange={(value) => handleChange('defaultModel', value)}
              options={[
                { label: 'GPT-4.1', value: 'gpt-4.1' },
                { label: 'GPT-4o', value: 'gpt-4o' },
                { label: 'Claude 3.5 Sonnet', value: 'claude-3.5-sonnet' },
              ]}
            />
            <SliderField
              id="creativity"
              label="Creativity Level"
              value={values.creativity}
              onChange={(value) => handleChange('creativity', value)}
              min={0}
              max={100}
            />
            <ToggleField
              id="autoSuggestions"
              label="Auto Suggestions"
              description="Enable proactive content ideas when drafting."
              checked={values.autoSuggestions}
              onChange={(value) => handleChange('autoSuggestions', value)}
            />
          </SectionCard>

          <SectionCard title="Appearance" description="Adjust the dashboard look and feel.">
            <SelectField
              id="theme"
              label="Theme"
              value={values.theme}
              onChange={(value) => handleChange('theme', value)}
              options={[
                { label: 'Light', value: 'light' },
                { label: 'Dark', value: 'dark' },
                { label: 'System', value: 'system' },
              ]}
            />
          </SectionCard>

          <SectionCard title="Notifications" description="Choose how updates reach you.">
            <ToggleField
              id="emailAlerts"
              label="Email Alerts"
              description="Get notified when important tasks are completed."
              checked={values.emailAlerts}
              onChange={(value) => handleChange('emailAlerts', value)}
            />
            <ToggleField
              id="weeklyReports"
              label="Weekly Reports"
              description="Receive a weekly summary of your activity."
              checked={values.weeklyReports}
              onChange={(value) => handleChange('weeklyReports', value)}
            />
          </SectionCard>

          <SectionCard title="Security" description="Protect your workspace with stronger safeguards.">
            <ToggleField
              id="twoFactorEnabled"
              label="Two Factor Authentication"
              description="Require a second verification step for sign-in."
              checked={values.twoFactorEnabled}
              onChange={(value) => handleChange('twoFactorEnabled', value)}
            />
          </SectionCard>

          <StatusBanner type="success" message={successMessage} />
        </form>
      </div>
    </main>
  );
}

export default SettingsPage;
