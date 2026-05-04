import React from 'react';

export interface FilterSelectionOption {
  id: string;
  label: string;
  helperText?: string;
}

const LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#64748b',
  marginBottom: 6,
};

const PANEL_STYLE: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: 10,
  borderRadius: 8,
  border: '1px solid #d9d9d9',
  background: '#fff',
};

const DESCRIPTION_STYLE: React.CSSProperties = {
  fontSize: 11,
  lineHeight: 1.45,
  color: '#64748b',
  margin: 0,
};

const OPTION_ROW_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 8,
  fontSize: 12,
  color: '#0f172a',
};

function normalizeSelectedFilterIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function FilterSelectionFieldControl({
  value,
  onChange,
  id,
  name,
  options,
  readOnly,
}: {
  value: string[] | undefined;
  onChange: (value: string[] | undefined) => void;
  id: string;
  name: string;
  options: FilterSelectionOption[];
  readOnly?: boolean;
}) {
  const selectedIds = normalizeSelectedFilterIds(value);
  const isShowingAllFilters = selectedIds.length === 0;

  const handleToggleFilter = (filterId: string) => {
    if (readOnly) {
      return;
    }

    if (selectedIds.includes(filterId)) {
      const nextSelection = selectedIds.filter((currentId) => currentId !== filterId);
      onChange(nextSelection.length > 0 ? nextSelection : undefined);
      return;
    }

    onChange([...selectedIds, filterId]);
  };

  return React.createElement(
    'div',
    null,
    React.createElement('span', { style: LABEL_STYLE }, 'Shown Filters'),
    React.createElement(
      'div',
      {
        id,
        style: PANEL_STYLE,
        'data-testid': `filter-selection-${name}`,
      },
      React.createElement(
        'label',
        { style: OPTION_ROW_STYLE },
        React.createElement('input', {
          type: 'radio',
          name,
          checked: isShowingAllFilters,
          onChange: () => onChange(undefined),
          disabled: readOnly,
          'aria-label': 'Show all authored filters',
        }),
        React.createElement(
          'span',
          null,
          React.createElement('strong', null, 'Show all authored filters'),
          React.createElement(
            'p',
            { style: DESCRIPTION_STYLE },
            'Leave the subset empty to render every authored dashboard filter in this bar.',
          ),
        ),
      ),
      options.length === 0
        ? React.createElement(
            'p',
            { style: DESCRIPTION_STYLE },
            'No authored filters are available yet. Once the dashboard defines filters, you can limit this bar to a subset here.',
          )
        : React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                paddingTop: 2,
              },
            },
            ...options.map((option) =>
              React.createElement(
                'label',
                { key: option.id, style: OPTION_ROW_STYLE },
                React.createElement('input', {
                  type: 'checkbox',
                  name: `${name}-${option.id}`,
                  checked: selectedIds.includes(option.id),
                  onChange: () => handleToggleFilter(option.id),
                  disabled: readOnly,
                  'aria-label': `Show filter ${option.label}`,
                }),
                React.createElement(
                  'span',
                  null,
                  React.createElement('strong', null, option.label),
                  option.helperText
                    ? React.createElement('p', { style: DESCRIPTION_STYLE }, option.helperText)
                    : null,
                ),
              ),
            ),
          ),
    ),
  );
}

export function createFilterSelectionField(options: FilterSelectionOption[]) {
  return {
    type: 'custom' as const,
    label: 'Shown Filters',
    render: ({
      value,
      onChange,
      id,
      name,
      readOnly,
    }: {
      value: string[] | undefined;
      onChange: (value: string[] | undefined) => void;
      id: string;
      name: string;
      readOnly?: boolean;
    }) =>
      React.createElement(FilterSelectionFieldControl, {
        value,
        onChange,
        id,
        name,
        options,
        readOnly,
      }),
  };
}
