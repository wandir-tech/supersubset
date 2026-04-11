/**
 * DrillBreadcrumbBar — renders a breadcrumb trail for drill-to-detail navigation.
 * Shows only when a drill is active. Each crumb is clickable to drill to that level.
 */
import { createElement } from 'react';
import { useDrill } from '../interactions/DrillManager';

export function DrillBreadcrumbBar() {
  const { drillState, drillTo, resetDrill } = useDrill();

  if (!drillState.active) {
    return null;
  }

  return createElement(
    'nav',
    { className: 'ss-drill-breadcrumb', 'aria-label': 'Drill breadcrumb' },
    createElement(
      'ol',
      { className: 'ss-drill-breadcrumb__list' },
      createElement(
        'li',
        { className: 'ss-drill-breadcrumb__item' },
        createElement(
          'button',
          {
            className: 'ss-drill-breadcrumb__link',
            type: 'button',
            onClick: resetDrill,
          },
          'All',
        ),
      ),
      ...drillState.breadcrumb.map((crumb, index) =>
        createElement(
          'li',
          {
            key: `${crumb.fieldRef}-${index}`,
            className: 'ss-drill-breadcrumb__item',
          },
          createElement('span', { className: 'ss-drill-breadcrumb__separator' }, ' › '),
          index < drillState.breadcrumb.length - 1
            ? createElement(
                'button',
                {
                  className: 'ss-drill-breadcrumb__link',
                  type: 'button',
                  onClick: () => drillTo(index),
                },
                crumb.label,
              )
            : createElement(
                'span',
                { className: 'ss-drill-breadcrumb__current', 'aria-current': 'page' },
                crumb.label,
              ),
        ),
      ),
    ),
    createElement(
      'button',
      {
        className: 'ss-drill-breadcrumb__reset',
        type: 'button',
        onClick: resetDrill,
      },
      'Reset',
    ),
  );
}
