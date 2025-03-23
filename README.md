# RunningLate

## Inspiration
We were initially inspired by a (Reddit post)[https://www.reddit.com/r/Strava/comments/8tmgyh/any_way_to_import_google_maps_gps_history_into/] about importing Google Maps data into Strava, which inspired us to integrate running into a navigation service.

## What it does
It uses your current location data, the destination address and your _Arrive By_ time to computes a pace that you must match to reach your destination on time. It provides real time pace and information on whether you need to speed up or not.

## How we built it
We used React Native with the Expo framework to create the app. We used the Google Maps API to show the directions and the destination to the user. The backend is written using Spring, a Java framework

## What's next for RunningLate
Some possible improvements for this app are
- Use Transit or STM API to alert you when a bus is passing 
- Friends leaderboards for clutchest runs
- Voice assistant to keep you on pace without having to look at the screen
- Import running data from Strava to have your best run times for better calculation


# Getting Started

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```
