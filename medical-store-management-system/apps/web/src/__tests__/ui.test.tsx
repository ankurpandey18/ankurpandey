import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Button,
  Badge,
  Input,
  Select,
  Spinner,
  PageHeader,
  EmptyState,
  ConfirmDialog,
} from '../components/ui';

describe('UI Components', () => {
  it('renders Button correctly', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('renders Button in loading state', () => {
    render(<Button isLoading>Submit</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
  });

  it('renders Badge with custom variant', () => {
    render(<Badge variant="active">Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders Input with label and error', () => {
    render(<Input label="Email" error="Invalid email address" defaultValue="test" />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email address');
  });

  it('renders Select with options', () => {
    render(
      <Select
        label="Role"
        options={[
          { value: 'OWNER', label: 'Owner' },
          { value: 'PHARMACIST', label: 'Pharmacist' },
        ]}
      />
    );
    expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders Spinner without crashing', () => {
    const { container } = render(<Spinner size="lg" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders PageHeader with title and action', () => {
    render(
      <PageHeader
        title="Employees"
        description="Manage store employees"
        action={<button>Add</button>}
      />
    );
    expect(screen.getByText('Employees')).toBeInTheDocument();
    expect(screen.getByText('Manage store employees')).toBeInTheDocument();
    expect(screen.getByText('Add')).toBeInTheDocument();
  });

  it('renders EmptyState', () => {
    render(
      <EmptyState
        title="No Records Found"
        description="Try adjusting your filters"
      />
    );
    expect(screen.getByText('No Records Found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument();
  });

  it('renders ConfirmDialog and triggers actions', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        isOpen={true}
        title="Delete Item"
        message="Are you sure?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
    expect(screen.getByText('Delete Item')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
