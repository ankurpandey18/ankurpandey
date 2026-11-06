import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge, Input, EmptyState, PageHeader } from '../components/ui';

describe('Phase 2 UI Component Verification', () => {
  it('renders inventory badge variants for batches and stock status', () => {
    const { rerender } = render(<Badge variant="success">IN_STOCK</Badge>);
    expect(screen.getByText('IN_STOCK')).toBeInTheDocument();

    rerender(<Badge variant="warning">NEAR_EXPIRY</Badge>);
    expect(screen.getByText('NEAR_EXPIRY')).toBeInTheDocument();

    rerender(<Badge variant="danger">EXPIRED</Badge>);
    expect(screen.getByText('EXPIRED')).toBeInTheDocument();

    rerender(<Badge variant="neutral">DRAFT</Badge>);
    expect(screen.getByText('DRAFT')).toBeInTheDocument();
  });

  it('renders PageHeader with medicine inventory actions', () => {
    render(
      <PageHeader
        title="Medicine Catalogue"
        description="Centralized store inventory and batch tracking"
        action={<button data-testid="add-med-btn">New Medicine</button>}
      />
    );
    expect(screen.getByText('Medicine Catalogue')).toBeInTheDocument();
    expect(screen.getByText('Centralized store inventory and batch tracking')).toBeInTheDocument();
    expect(screen.getByTestId('add-med-btn')).toHaveTextContent('New Medicine');
  });

  it('renders EmptyState for empty inventory ledger search', () => {
    render(
      <EmptyState
        title="No Stock Movements Found"
        description="There are no stock ledger entries matching the selected criteria."
      />
    );
    expect(screen.getByText('No Stock Movements Found')).toBeInTheDocument();
    expect(
      screen.getByText('There are no stock ledger entries matching the selected criteria.')
    ).toBeInTheDocument();
  });

  it('renders barcode search input with placeholder', () => {
    render(
      <Input
        label="Scan or Enter Barcode"
        placeholder="e.g. 8901234567890"
        defaultValue="8901030000001"
      />
    );
    expect(screen.getByLabelText(/scan or enter barcode/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('8901030000001')).toBeInTheDocument();
  });
});
