// @flow

import React, { PropTypes } from 'react';
import {
  Animated,
  BackAndroid,
  Easing,
  PixelRatio,
  Platform,
  StyleSheet,
  Text,
  Image,
  NativeModules,
  TouchableOpacity,
  TouchableNativeFeedback,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

type ActionSheetOptions = {
  options: Array<string>,
  icons: ?Array<number>,
  destructiveButtonIndex: ?number,
  cancelButtonIndex: ?number,
  textStyle: ?any,
}

type ActionGroupProps = {
  options: Array<string>,
  icons: ?Array<number>,
  destructiveButtonIndex: ?number,
  onSelect: (i: number) => boolean,
  startIndex: number,
  length: number,
  textStyle: ?any,
}

type ActionSheetState = {
  isVisible: boolean,
  isAnimating: boolean,
  options: ?ActionSheetOptions,
  onSelect: ?(i: number) => void,
  overlayOpacity: any,
  sheetOpacity: any,
}

type ActionSheetProps = {
  children: ?any,
  useNativeDriver: ?boolean,
}

const OPACITY_ANIMATION_TIME = 150;
const PIXEL = 1 / PixelRatio.get();

class ActionGroup extends React.Component {

  constructor(props){
    super(props);
    this.state = {}
  }

  render() {
    let {
      options,
      icons,
      destructiveButtonIndex,
      startIndex,
      length,
      textStyle,
    } = this.props;
    let optionViews = [];

    let nativeFeedbackBackground = TouchableNativeFeedbackSafe.Ripple(
      'rgba(180, 180, 180, 1)',
      false
    );

    for (let i = startIndex; i < startIndex + length; i++) {
      let color = '#444444';
      if (i === destructiveButtonIndex) {
        color = '#ff3b30';
      }

      let iconElement = undefined

      if (icons && icons[i]) {
        iconElement = (
          <Image
            source={icons[i]}
            style={styles.icon}
          />
          )
      }
      console.log("pushing option views");
      optionViews.push(
        <TouchableNativeFeedbackSafe
          key={i}
          pressInDelay={0}
          index={i}
          background={nativeFeedbackBackground}
          onPress={ () => this.props.onSelect(i) }
          style={styles.button}>
          {iconElement}
          <Text style={[styles.text, {color}, textStyle]}>
            {options[i]}
          </Text>
        </TouchableNativeFeedbackSafe>
      );

      if (i < startIndex + length - 1) {
        optionViews.push(
          <View key={`separator-${i}`} style={styles.rowSeparator} />
        );
      }
    }

    return (
      <View style={styles.groupContainer}>
        {optionViews}
      </View>
    );
  }
}

// Has same API as https://facebook.github.io/react-native/docs/actionsheetios.html
export default class ActionSheet extends React.Component {

  constructor(props){
    super(props);
    console.log("construction");
    this.state = {
      isVisible: false,
      isAnimating: false,
      options: null,
      onSelect: null,
      overlayOpacity: new Animated.Value(0),
      sheetOpacity: new Animated.Value(0),
    }
    this.showActionSheetWithOptions = this.showActionSheetWithOptions.bind(this);
    this._selectCancelButton = this._selectCancelButton.bind(this);
    this._renderSheet = this._renderSheet.bind(this);
    this._onSelect = this._onSelect.bind(this);
    this._animateOut = this._animateOut.bind(this);
  }

  props: ActionSheetProps;
  _animateOutCallback: ?() => void = null;

  render() {
    let { isVisible } = this.state;
    let overlay = isVisible ? (
      <Animated.View style={[styles.overlay, {
        opacity: this.state.overlayOpacity,
      }]} />
    ) : null;

    let sheet = isVisible ? this._renderSheet() : null;

    return (
      <View style={{flex: 1}}>
        {React.Children.only(this.props.children)}
        {overlay}
        {sheet}
      </View>
    );
  }

  _onSelect(index) {
    if (this.state.isAnimating) {
      return false;
    }
    console.log("cunt", this.state.onSelect, Object.keys(this.state));
    this.state.onSelect(index);
    return this._animateOut();
  }

  _renderSheet() {
    if (!this.state.options) {
      return;
    }

    let numOptions = this.state.options.options.length;

    const self = this;

    return (
      <TouchableWithoutFeedback onPress={this._selectCancelButton}>
        <Animated.View
          needsOffscreenAlphaCompositing={this.state.isAnimating}
          style={[styles.sheetContainer, {
            opacity: this.state.sheetOpacity,
            transform: [{scale: this.state.sheetOpacity.interpolate({inputRange: [0, 0.5, 1], outputRange: [0.6, 1, 1]})}],
          }]}>
          <View style={styles.sheet}>
            <ActionGroup
              options={this.state.options.options}
              icons={this.state.options.icons}
              destructiveButtonIndex={this.state.options.destructiveButtonIndex}
              onSelect={ this._onSelect }
              startIndex={0}
              length={numOptions}
              textStyle={this.state.options.textStyle}
            />
          </View>
        </Animated.View>
      </TouchableWithoutFeedback>
    );
  }

  showActionSheetWithOptions(options, onSelect = (b) => { console.log("b", b) }, onAnimateOut) {
    console.log(options, onSelect, onAnimateOut);
    if (this.state.isVisible) {
      return;
    }

    console.log("was not visible :)");

    this.setState({
      options,
      onSelect,
      isVisible: true,
      isAnimating: true,
    });

    this.state.overlayOpacity.setValue(0);
    this.state.sheetOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(this.state.overlayOpacity, {
        toValue: 0.5,
        easing: Easing.in(Easing.linear),
        duration: OPACITY_ANIMATION_TIME,
        useNativeDriver: this.props.useNativeDriver,
      }),
      Animated.timing(this.state.sheetOpacity, {
        toValue: 1,
        easing: Easing.in(Easing.linear),
        duration: OPACITY_ANIMATION_TIME,
        useNativeDriver: this.props.useNativeDriver,
      }),
    ]).start(result => {
      if (result.finished) {
        this.setState({
          isAnimating: false,
        });
      }
    });

    this._animateOutCallback = onAnimateOut;

    BackAndroid.addEventListener('actionSheetHardwareBackPress', this._selectCancelButton);
  }

  _selectCancelButton() {
    if (!this.state.options) {
      return false;
    }

    if (typeof this.state.options.cancelButtonIndex === 'number') {
      return this._onSelect(this.state.options.cancelButtonIndex);
    } else {
      return this._animateOut();
    }
  }

  _animateOut() {
    if (this.state.isAnimating) {
      return false;
    }

    BackAndroid.removeEventListener('actionSheetHardwareBackPress', this._selectCancelButton);

    this.setState({
      isAnimating: true,
    });

    Animated.parallel([
      Animated.timing(this.state.overlayOpacity, {
        toValue: 0,
        easing: Easing.in(Easing.linear),
        duration: OPACITY_ANIMATION_TIME,
        useNativeDriver: this.props.useNativeDriver,
      }),
      Animated.timing(this.state.sheetOpacity, {
        toValue: 0,
        easing: Easing.in(Easing.linear),
        duration: OPACITY_ANIMATION_TIME,
        useNativeDriver: this.props.useNativeDriver,
      }),
    ]).start(result => {
      if (result.finished) {
        this.setState({
          isVisible: false,
          isAnimating: false,
        });
        if (typeof this._animateOutCallback === 'function') {
          this._animateOutCallback();
          this._animateOutCallback = null;
        }
      }
    });

    return true;
  }
}

ActionSheet.defaultProps = {
  useNativeDriver: true
};

let TouchableComponent;

TouchableComponent = Platform.Version <= 20 ? TouchableOpacity : TouchableNativeFeedback;

if (TouchableComponent !== TouchableNativeFeedback) {
  TouchableComponent.SelectableBackground = () => ({});
  TouchableComponent.SelectableBackgroundBorderless = () => ({});
  TouchableComponent.Ripple = (color, borderless) => ({});
}

class TouchableNativeFeedbackSafe extends React.Component {

  static SelectableBackground = TouchableComponent.SelectableBackground;
  static SelectableBackgroundBorderless = TouchableComponent.SelectableBackgroundBorderless;
  static Ripple = TouchableComponent.Ripple;

  render() {
    if (TouchableComponent === TouchableNativeFeedback) {
      return (
        <TouchableComponent {...this.props} style={{}}>
          <View style={this.props.style}>
            {this.props.children}
          </View>
        </TouchableComponent>
      );
    } else {
      return (
        <TouchableComponent {...this.props}>
          {this.props.children}
        </TouchableComponent>
      );
    }
  }
}

let styles = StyleSheet.create({
  groupContainer: {
    backgroundColor: '#fefefe',
    borderRadius: 4,
    borderColor: '#cbcbcb',
    borderWidth: PIXEL,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  button: {
    justifyContent: 'flex-start',
    alignItems: 'center',
    flexDirection: 'row',
    height: 50,
    paddingHorizontal: 16,
  },
  icon: {
    marginRight: 15,
  },
  text: {
    fontSize: 17,
    fontWeight: '700',
    textAlignVertical: 'center',
  },
  rowSeparator: {
    backgroundColor: '#dddddd',
    height: 1,
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'black',
  },
  sheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  sheet: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
