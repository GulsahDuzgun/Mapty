'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  #map;
  #mapEvent;
  #mapZoomLevel = 13;
  workouts = [];

  constructor() {
    this._getPosition();
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField.bind(this));
    containerWorkouts.addEventListener('click', this._moveToMarker.bind(this));
    this._getLocalStorage();
  }

  _getPosition() {
    navigator.geolocation.getCurrentPosition(
      this._loadMap.bind(this),
      function () {
        alert('Could not get your position ');
      }
    );
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    const coords = [latitude, longitude];

    // console.log(
    //   `https://www.google.com/maps/@${latitude},${longitude},12z?entry=ttu`
    // );

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    L.marker(coords).addTo(this.#map).bindPopup('Hello').openPopup();
    this.workouts.forEach(work => this._renderWorkoutMarker(work));
  }

  _newWorkout(e) {
    e.preventDefault();
    const { lat, lng } = this.#mapEvent.latlng;
    const duration = +inputDuration.value;
    const distance = +inputDistance.value;
    const type = inputType.value;
    let workout;

    const validPositive = (...args) => args.every(el => el > 0);

    const allInputNum = (...args) => args.every(el => Number.isFinite(el));

    if (type === 'running') {
      const cadence = +inputCadence.value;

      if (
        !validPositive(duration, distance, cadence) ||
        !allInputNum(duration, distance, cadence)
      ) {
        return alert('Inputs have to be positive number');
      }
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    if (type === 'cycling') {
      const elevationGain = +inputElevation.value;

      if (
        !validPositive(duration, distance) ||
        !allInputNum(duration, distance, elevationGain)
      ) {
        return alert('Inputs have to be positive number');
      }
      workout = new Cycling([lat, lng], distance, duration, elevationGain);
    }

    this.workouts.push(workout);
    this._renderWorkoutMarker(workout);
    this._renderWorkout(workout);
    this._hideForm();
    this._setLocalStorage();
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.headerSummary}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;

    if (workout.type === 'running') {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.cadence.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      `;
    }

    if (workout.type === 'cycling') {
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.elevationGain.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">m</span>
      </div>
    </li>
      `;
    }
    form.insertAdjacentHTML('afterend', html);
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.headerSummary}`
      )
      .openPopup();
  }

  _moveToMarker(e) {
    const clikedMovements = e.target.closest('.workout');
    if (!clikedMovements) return; //guard

    const workout = this.workouts.find(
      work => work.id === clikedMovements.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // workout.clicks();
  }

  _showForm(e) {
    this.#mapEvent = e;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.workouts = data;
    // this.workouts[0].clicks();

    this.workouts.forEach(elm => this._renderWorkout(elm));
  }

  resetLocalStorage() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

class Workout {
  id = (Date.now() + '').slice(-10);
  #date = new Date();
  click = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; //[lat, lng]
    this.distance = distance;
    this.duration = duration;
  }

  _setHeaderWorkout() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.headerSummary = `${
      this.type[0].toUpperCase() + this.type.slice(1)
    } on ${months[this.#date.getMonth()]}  ${this.#date.getDate()}`;
  }

  // _getId() {
  //   return this.#id;
  // }

  clicks() {
    this.click++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setHeaderWorkout();
  }

  calcPace() {
    this.pace = this.duration / this.distance; //min/km
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setHeaderWorkout();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

const app = new App();
console.log(app);
