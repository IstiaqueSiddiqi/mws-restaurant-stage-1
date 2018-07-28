let restaurants,
  neighborhoods,
  cuisines
var newMap
var markers = [];

const MAPBOX_API_KEY = "pk.eyJ1IjoiaXN0aWFxdWUxOCIsImEiOiJjampjbzhxYnEyM3ZlM3Z0ZWRncHVsOXEyIn0.G92w014uYkp64EiGScJH8Q";

/**
* Register service worker
*/
const registerServiceWorker = () => {
  if (!navigator.serviceWorker) return;

  navigator.serviceWorker.register('/sw.js').then((reg) => {
    console.log(`Service worker registered.. ${JSON.stringify(reg)}`);

    if (!navigator.serviceWorker.controller) {
      return;
    }

    if (reg.waiting) {
      updateReady(reg.waiting);
      return;
    }

    if (reg.installing) {
      trackInstalling(reg.installing);
      return;
    }

    reg.addEventListener('updatefound', () => {
      trackInstalling(reg.installing);
    });
  }).catch(err => {
    console.error(`Error while registering service worker ${err}`);
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
};

trackInstalling = (sw) => {
  sw.addEventListener('statechange', () => {
    if (sw.state == 'installed') {
      this.updateReady(sw);
    }
  });
};

updateReady = (sw) => {
  sw.postMessage({ action: 'skipWaiting' });
};


/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  registerServiceWorker();
  initMap(); // added 
  fetchNeighborhoods();
  fetchCuisines();
});


/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
};

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
};

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
};

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
};

/**
 * Initialize leaflet map, called from HTML.
 */
initMap = () => {
  self.newMap = L.map('map', {
    center: [40.722216, -73.987501],
    zoom: 12,
    scrollWheelZoom: false
  });
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
    mapboxToken: MAPBOX_API_KEY,
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
      '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox.streets'
  }).addTo(newMap);

  updateRestaurants();
};
/* window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
} */

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  })
};

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  if (self.markers) {
    self.markers.forEach(marker => marker.remove());
  }
  self.markers = [];
  self.restaurants = restaurants;
};

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
};

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');
  const info = `Image of restaurant name ${restaurant.name}, located nearby ${restaurant.neighborhood}, address ${restaurant.address}`;

  const image = document.createElement('img');
  const imgsrc = DBHelper.imageUrlForRestaurant(restaurant);
  image.className = 'restaurant-img';
  image.src = `/img/${imgsrc}.webp`;
  image.srcset = `/img/${imgsrc}.webp 1x, /img/${imgsrc}.jpg 2x`;
  image.alt = info;
  image.tabIndex = 0;

  li.append(image);

  const name = document.createElement('h2');
  name.innerHTML = restaurant.name;
  name.setAttribute('aria-label', restaurant.name);
  li.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  more.setAttribute('role', 'button');
  more.setAttribute('aria-label', 'View Details');
  more.setAttribute('aria-pressed', 'false');

  li.append(more)

  return li
};

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.newMap);
    marker.on("click", onClick);
    function onClick() {
      window.location.href = marker.options.url;
    }
    self.markers.push(marker);
  });
};
/* addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
}; */

/*Accesibility*/

handleBtnClick = (event) => {
  toggleButton(event.target);
};

handleBtnKeyPress = (event) => {
  // Check to see if space or enter were pressed
  if (event.key === " " || event.key === "Enter") {
    // Prevent the default action to stop scrolling when space is pressed
    event.preventDefault();
    toggleButton(event.target);
  }
};

toggleButton = (element) => {
  // Check to see if the button is pressed
  var pressed = (element.getAttribute("aria-pressed") === "true");
  // Change aria-pressed to the opposite state
  element.setAttribute("aria-pressed", !pressed);
};
