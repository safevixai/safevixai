// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FirstAidCard } from '../FirstAidCard';

describe('FirstAidCard', function() {
  it('renders title', function() {
    render(<FirstAidCard title="CPR" icon="🫀" steps={[]} />);
    expect(screen.getByText('CPR')).toBeInTheDocument();
  });

  it('renders string icon', function() {
    render(<FirstAidCard title="CPR" icon="🫀" steps={[]} />);
    expect(screen.getByText('🫀')).toBeInTheDocument();
  });

  it('renders React node icon', function() {
    render(<FirstAidCard title="Burns" icon={<span data-testid="custom-icon">🔥</span>} steps={[]} />);
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('renders steps as ordered list', function() {
    var steps = ['Step one', 'Step two', 'Step three'];
    render(<FirstAidCard title="First Aid" icon="+" steps={steps} />);
    expect(screen.getByText('Step one')).toBeInTheDocument();
    expect(screen.getByText('Step two')).toBeInTheDocument();
    expect(screen.getByText('Step three')).toBeInTheDocument();
  });

  it('renders empty steps without crashing', function() {
    var { container } = render(<FirstAidCard title="CPR" icon="+" steps={[]} />);
    var list = container.querySelector('ol');
    expect(list).toBeInTheDocument();
    expect(list?.children.length).toBe(0);
  });

  it('renders bold text from ** markers', function() {
    var steps = ['Call **112** immediately'];
    render(<FirstAidCard title="Emergency" icon="!" steps={steps} />);
    var strong = screen.getByText('112');
    expect(strong.tagName).toBe('STRONG');
  });

  it('renders plain text around bold markers', function() {
    var steps = ['Call **112** immediately'];
    var { container } = render(<FirstAidCard title="Emergency" icon="!" steps={steps} />);
    expect(container.querySelector('strong')).toHaveTextContent('112');
    expect(container.querySelectorAll('span').length).toBeGreaterThan(0);
  });

  it('renders steps without bold markers', function() {
    var steps = ['Check for breathing'];
    render(<FirstAidCard title="First Aid" icon="+" steps={steps} />);
    expect(screen.getByText('Check for breathing')).toBeInTheDocument();
  });

  it('shows offline badge', function() {
    render(<FirstAidCard title="CPR" icon="+" steps={[]} />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('has card-glass class', function() {
    var { container } = render(<FirstAidCard title="CPR" icon="+" steps={[]} />);
    expect(container.firstChild).toHaveClass('card-glass');
  });

  it('renders step with multiple bold segments', function() {
    var steps = ['Check **A** for **B** and **C**'];
    render(<FirstAidCard title="MultiBold" icon="!" steps={steps} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('Check')).toBeInTheDocument();
    expect(screen.getByText('for')).toBeInTheDocument();
    expect(screen.getByText('and')).toBeInTheDocument();
  });

  it('renders step that is only bold text', function() {
    var steps = ['**URGENT**'];
    render(<FirstAidCard title="Urgent" icon="!" steps={steps} />);
    var strong = screen.getByText('URGENT');
    expect(strong.tagName).toBe('STRONG');
  });

  it('renders step starting with bold', function() {
    var steps = ['**Note**: Important instruction'];
    var { container } = render(<FirstAidCard title="Note" icon="!" steps={steps} />);
    var strongs = container.querySelectorAll('strong');
    expect(strongs.length).toBe(1);
    expect(strongs[0]).toHaveTextContent('Note');
    expect(screen.getByText(': Important instruction')).toBeInTheDocument();
  });

  it('renders unclosed bold marker gracefully', function() {
    var steps = ['Check **this out'];
    render(<FirstAidCard title="Malformed" icon="!" steps={steps} />);
    expect(screen.getByText('Check **this out')).toBeInTheDocument();
  });

  it('renders empty bold markers', function() {
    var steps = ['Test **** done'];
    render(<FirstAidCard title="EmptyBold" icon="!" steps={steps} />);
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('done')).toBeInTheDocument();
  });

  it('renders step with unicode characters', function() {
    var steps = ['उपचार **112** पर कॉल करें'];
    render(<FirstAidCard title="Hindi" icon="!" steps={steps} />);
    expect(screen.getByText('112')).toBeInTheDocument();
    expect(screen.getByText(/उपचार/)).toBeInTheDocument();
    expect(screen.getByText(/पर कॉल करें/)).toBeInTheDocument();
  });

  it('renders many steps without crashing', function() {
    var steps = Array.from({ length: 20 }, (_, i) => `Step number ${i + 1}`);
    render(<FirstAidCard title="ManySteps" icon="+" steps={steps} />);
    expect(screen.getByText('Step number 20')).toBeInTheDocument();
  });
});


