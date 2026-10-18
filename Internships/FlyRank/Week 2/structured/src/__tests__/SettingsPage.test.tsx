import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsPage from '../pages/SettingsPage';

describe('SettingsPage', () => {
  it('shows validation for empty name', async () => {
    render(<SettingsPage />);

    const nameInput = screen.getByRole('textbox', { name: /name/i });
    await userEvent.clear(nameInput);
    await userEvent.tab();

    expect(await screen.findByText('Name is required.')).toBeInTheDocument();
  });

  it('shows validation for invalid email', async () => {
    render(<SettingsPage />);

    const emailInput = screen.getByRole('textbox', { name: /email/i });
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, 'invalid-email');
    await userEvent.tab();

    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
  });

  it('submits successfully with valid values', async () => {
    render(<SettingsPage />);

    const nameInput = screen.getByRole('textbox', { name: /name/i });
    const emailInput = screen.getByRole('textbox', { name: /email/i });

    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Jordan Lee');
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, 'jordan@flyrank.com');
    await userEvent.click(screen.getByRole('button', { name: /^save changes$/i }));

    await waitFor(() => expect(screen.getByText('Settings saved successfully.')).toBeInTheDocument());
  });

  it('disables save button until the form is valid', async () => {
    render(<SettingsPage />);

    const nameInput = screen.getByRole('textbox', { name: /name/i });
    await userEvent.clear(nameInput);
    await userEvent.tab();

    const saveButton = screen.getByRole('button', { name: /^save changes$/i });
    expect(saveButton).toBeDisabled();
  });

  it('toggles auto suggestions on interaction', async () => {
    render(<SettingsPage />);

    const toggle = screen.getByRole('switch', { name: /auto suggestions/i });
    expect(toggle).toHaveAttribute('aria-checked', 'true');

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });
});
