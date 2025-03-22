import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  it('renders correctly with default props', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-primary');
  });

  it('applies different variants correctly', () => {
    const { rerender } = render(<Button variant="destructive">Destructive</Button>);
    let button = screen.getByRole('button', { name: /destructive/i });
    
    expect(button).toHaveClass('bg-destructive');
    
    rerender(<Button variant="outline">Outline</Button>);
    button = screen.getByRole('button', { name: /outline/i });
    
    expect(button).toHaveClass('border-input');
  });

  it('applies different sizes correctly', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    let button = screen.getByRole('button', { name: /small/i });
    
    expect(button).toHaveClass('h-9');
    
    rerender(<Button size="lg">Large</Button>);
    button = screen.getByRole('button', { name: /large/i });
    
    expect(button).toHaveClass('h-11');
  });

  it('handles click events', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();
    
    render(<Button onClick={handleClick}>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    
    await user.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders as a child component when asChild is true', () => {
    render(
      <Button asChild>
        <a href="https://example.com">Link Button</a>
      </Button>
    );
    
    const link = screen.getByRole('link', { name: /link button/i });
    
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveClass('bg-primary');
  });

  it('applies custom className', () => {
    render(<Button className="custom-class">Custom Button</Button>);
    const button = screen.getByRole('button', { name: /custom button/i });
    
    expect(button).toHaveClass('custom-class');
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button', { name: /disabled/i });
    
    expect(button).toBeDisabled();
  });
}); 