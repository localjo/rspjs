import _extends from '@babel/runtime/helpers/esm/extends';
import _objectWithoutPropertiesLoose from '@babel/runtime/helpers/esm/objectWithoutPropertiesLoose';
import {
  createContext,
  memo,
  forwardRef,
  useContext,
  useImperativeHandle,
  createElement,
  useState,
  useEffect,
  useRef,
} from 'react';
import { Controller, a, config } from '@react-spring/web';
import { useMemoOne } from 'use-memo-one';
import { frameLoop } from '@react-spring/shared/globals';
import { useOnce } from '@react-spring/shared';

const ParentContext = createContext(null);

function getScrollType(horizontal) {
  return horizontal ? 'scrollLeft' : 'scrollTop';
}

const START_TRANSLATE_3D = 'translate3d(0px,0px,0px)';
const START_TRANSLATE = 'translate(0px,0px)';
const ParallaxLayer = memo(
  forwardRef((_ref, ref) => {
    let { horizontal, factor = 1, offset = 0, speed = 0 } = _ref,
      rest = _objectWithoutPropertiesLoose(_ref, [
        'horizontal',
        'factor',
        'offset',
        'speed',
      ]);

    // Our parent controls our height and position.
    const parent = useContext(ParentContext); // This is how we animate.

    const ctrl = useMemoOne(() => {
      const targetScroll = Math.floor(offset) * parent.space;
      const distance = parent.space * offset + targetScroll * speed;
      return new Controller({
        space: parent.space * factor,
        translate: -(parent.current * speed) + distance,
      });
    }, []); // Create the layer.

    const layer = useMemoOne(
      () => ({
        setPosition(height, scrollTop, immediate = false) {
          const distance = height * offset;
          ctrl.start({
            translate: -(scrollTop * speed) + distance,
            config: parent.config,
            immediate,
          });
        },

        setHeight(height, immediate = false) {
          ctrl.start({
            space: height * factor,
            config: parent.config,
            immediate,
          });
        },
      }),
      []
    );
    useImperativeHandle(ref, () => layer); // Register the layer with our parent.

    useOnce(() => {
      if (parent) {
        parent.layers.add(layer);
        parent.update();
        return () => {
          parent.layers.delete(layer);
          parent.update();
        };
      }
    });
    const translate3d = ctrl.springs.translate.to(
      horizontal
        ? (x) => 'translate3d(' + x + 'px,0,0)'
        : (y) => 'translate3d(0,' + y + 'px,0)'
    );
    return /*#__PURE__*/ createElement(
      a.div,
      _extends({}, rest, {
        style: _extends(
          {
            position: 'absolute',
            backgroundSize: 'auto',
            backgroundRepeat: 'no-repeat',
            willChange: 'transform',
            [horizontal ? 'height' : 'width']: '100%',
            [horizontal ? 'width' : 'height']: ctrl.springs.space,
            WebkitTransform: translate3d,
            msTransform: translate3d,
            transform: translate3d,
          },
          rest.style
        ),
      })
    );
  })
);
const Parallax = memo(
  forwardRef((props, ref) => {
    const [ready, setReady] = useState(false);

    const {
        pages,
        config: config$1 = config.slow,
        enabled = true,
        horizontal = false,
      } = props,
      rest = _objectWithoutPropertiesLoose(props, [
        'pages',
        'innerStyle',
        'config',
        'enabled',
        'horizontal',
      ]);

    const state = useMemoOne(
      () => ({
        config: config$1,
        busy: false,
        space: 0,
        current: 0,
        offset: 0,
        controller: new Controller({
          scroll: 0,
        }),
        layers: new Set(),
        update: (function (_update) {
          function update() {
            return _update.apply(this, arguments);
          }

          update.toString = function () {
            return _update.toString();
          };

          return update;
        })(() => update()),
        scrollTo: (function (_scrollTo) {
          function scrollTo(_x) {
            return _scrollTo.apply(this, arguments);
          }

          scrollTo.toString = function () {
            return _scrollTo.toString();
          };

          return scrollTo;
        })((offset) => scrollTo(offset)),
        stop: () => state.controller.stop(),
      }),
      []
    );
    useEffect(() => {
      state.config = config$1;
    }, [config$1]);
    useImperativeHandle(ref, () => state);
    const containerRef = useRef();
    const contentRef = useRef();

    const update = () => {
      const container = containerRef.current;
      if (!container) return;
      const spaceProp = horizontal ? 'clientWidth' : 'clientHeight';
      state.space = container[spaceProp];
      const scrollType = getScrollType(horizontal);

      if (enabled) {
        state.current = container[scrollType];
      } else {
        container[scrollType] = state.current = state.offset * state.space;
      }

      const content = contentRef.current;

      if (content) {
        const sizeProp = horizontal ? 'width' : 'height';
        content.style[sizeProp] = state.space * pages + 'px';
      }

      state.layers.forEach((layer) => {
        layer.setHeight(state.space, true);
        layer.setPosition(state.space, state.current, true);
      });
    };

    const scrollTo = (offset) => {
      const container = containerRef.current;
      const scrollType = getScrollType(horizontal);
      state.offset = offset;
      state.controller.stop().start({
        scroll: offset * state.space,
        config: config$1,

        onChange({ scroll }) {
          container[scrollType] = scroll;
        },
      });
    };

    const onScroll = (event) => {
      if (!state.busy) {
        state.busy = true;
        state.current = event.target[getScrollType(horizontal)];
        frameLoop.onFrame(() => {
          state.layers.forEach((layer) =>
            layer.setPosition(state.space, state.current)
          );
          state.busy = false;
        });
      }
    };

    useEffect(() => state.update());
    useOnce(() => {
      setReady(true);

      const onResize = () => {
        const update = () => state.update();

        frameLoop.onFrame(update);
        setTimeout(update, 150); // Some browsers don't fire on maximize!
      };

      window.addEventListener('resize', onResize, false);
      return () => window.removeEventListener('resize', onResize, false);
    });
    const overflow = enabled ? 'scroll' : 'hidden';
    return /*#__PURE__*/ createElement(
      a.div,
      _extends({}, rest, {
        ref: containerRef,
        onScroll: onScroll,
        onWheel: enabled ? state.stop : undefined,
        onTouchStart: enabled ? state.stop : undefined,
        style: _extends(
          {
            position: 'absolute',
            width: '100%',
            height: '100%',
            overflow,
            overflowY: horizontal ? 'hidden' : overflow,
            overflowX: horizontal ? overflow : 'hidden',
            WebkitOverflowScrolling: 'touch',
            WebkitTransform: START_TRANSLATE,
            msTransform: START_TRANSLATE,
            transform: START_TRANSLATE_3D,
          },
          rest.style
        ),
      }),
      ready &&
        /*#__PURE__*/ createElement(
          a.div,
          {
            ref: contentRef,
            style: _extends(
              {
                overflow: 'hidden',
                position: 'absolute',
                [horizontal ? 'height' : 'width']: '100%',
                [horizontal ? 'width' : 'height']: state.space * pages,
                WebkitTransform: START_TRANSLATE,
                msTransform: START_TRANSLATE,
                transform: START_TRANSLATE_3D,
              },
              props.innerStyle
            ),
          },
          /*#__PURE__*/ createElement(
            ParentContext.Provider,
            {
              value: state,
            },
            rest.children
          )
        )
    );
  })
);

export { Parallax, ParallaxLayer };
//# sourceMappingURL=index.js.map
