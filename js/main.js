let restaurants,
  neighborhoods,
  cuisines
var newMap
var markers = [];
let isConnected = navigator.onLine;

const MAPBOX_API_KEY = "pk.eyJ1IjoiaXN0aWFxdWUxOCIsImEiOiJjampjbzhxYnEyM3ZlM3Z0ZWRncHVsOXEyIn0.G92w014uYkp64EiGScJH8Q";

/**
* Register service worker
*/
const registerServiceWorker = () => {
  if (!navigator.serviceWorker && !window.SyncManager) return;

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

  // Request a one-off sync:
  navigator.serviceWorker.ready.then((swRegistration) => {
    let tagName = 'myFirstSync';
    return swRegistration.sync.register(tagName);
  });
};

const trackInstalling = (sw) => {
  sw.addEventListener('statechange', () => {
    if (sw.state == 'installed') {
      this.updateReady(sw);
    }
  });
};

const updateReady = (sw) => {
  sw.postMessage({ action: 'skipWaiting' });
};


/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  if (!isConnected) {
    showToast(`Viewing content in offline!!`);
  }
  registerServiceWorker();
  initMap(); // added 
  fetchNeighborhoods();
  fetchCuisines();
});


/**
 * Fetch all neighborhoods and set their HTML.
 */
const fetchNeighborhoods = () => {
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
const fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
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
const fetchCuisines = () => {
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
const fillCuisinesHTML = (cuisines = self.cuisines) => {
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
const initMap = () => {
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
const updateRestaurants = () => {
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
const resetRestaurants = (restaurants) => {
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
const fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
};

/**
 * Create restaurant HTML.
 */
const createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');
  const info = `Image of restaurant name ${restaurant.name}, located nearby ${restaurant.neighborhood}, address ${restaurant.address}`;

  const image = document.createElement('img');
  const imgsrc = DBHelper.imageUrlForRestaurant(restaurant);
  image.className = 'restaurant-img';
  image.src = `/build/img/${imgsrc}.webp`;
  image.srcset = `/build/img/${imgsrc}.webp 1x, /build/img/${imgsrc}.jpg 2x`;
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
  li.append(more);

  let is_favorite = ((restaurant.is_favorite === "true") || restaurant.is_favorite === true) ? true : false;
  const favourite = document.createElement('button');
  favourite.id = `btn_favourite_${restaurant.id}`;
  favourite.className = `btn_favourite${is_favorite ? ' isFavourite' : ""}`;
  favourite.innerHTML = `<svg width="24" height="24" class="unmark"><title/><desc/>
  <g><title>background</title><rect fill="none" id="canvas_background_unmark_${restaurant.id}" height="402" width="582" y="-1" x="-1"/></g>
  <g><title>Favourite</title><path id="common-star-favorite-bookmark-glyph_unmark_${restaurant.id}" fill="#e0e0e0" d="m11.98491,18.13638l-6.79837,4.86362l2.34983,-8.01246l-6.53637,-5.42578l7.94983,-0.06841l3.03508,-8.49335l2.95112,8.56177l8.06397,0l-6.56655,5.47856l2.34983,7.95967l-6.79837,-4.86362l0,0z"/></g></svg>
  <svg width="24" height="24" class="mark"><title/><desc/>
  <g><title>background</title><rect fill="none" id="canvas_background_mark_${restaurant.id}" height="402" width="582" y="-1" x="-1"/></g>
  <g><title>Favourite</title><path id="common-star-favorite-bookmark-glyph_mark_${restaurant.id}" fill="#ff0000" d="m11.98491,18.13638l-6.79837,4.86362l2.34983,-8.01246l-6.53637,-5.42578l7.94983,-0.06841l3.03508,-8.49335l2.95112,8.56177l8.06397,0l-6.56655,5.47856l2.34983,7.95967l-6.79837,-4.86362l0,0z"/></g></svg>`;
  favourite.setAttribute('aria-label', (is_favorite) ? `Mark ${restaurant.name} restaurant as not favourite` : `Mark ${restaurant.name} restaurant as favourite`);
  favourite.setAttribute('aria-pressed', is_favorite);
  favourite.tabIndex = 0;

  favourite.addEventListener('click', (e) => {
    let btn_favourite = document.getElementById(`btn_favourite_${restaurant.id}`);
    btn_favourite.classList.toggle('isFavourite');
    is_favorite = btn_favourite.classList.contains('isFavourite');
    favourite.setAttribute('aria-label', is_favorite ? `Mark ${restaurant.name} restaurant as not favourite` : `Mark ${restaurant.name} restaurant as favourite`);
    favourite.setAttribute('aria-pressed', is_favorite);
    restaurant.is_favorite = is_favorite;
    DBHelper.toggleFavBtn(restaurant).then(favourite => {
      console.info(`Updated your favourite restaurant: ${JSON.stringify(favourite)}`);
    }).catch(error => {
      console.error(`Failed updating favourite restaurant: ${error.stack}`);
    });
  });
  li.appendChild(favourite);



  return li
};


/**
 * Add markers for current restaurants to the map.
 */
const addMarkersToMap = (restaurants = self.restaurants) => {
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

const handleBtnClick = (event) => {
  toggleButton(event.target);
};

const handleBtnKeyPress = (event) => {
  // Check to see if space or enter were pressed
  if (event.key === " " || event.key === "Enter") {
    // Prevent the default action to stop scrolling when space is pressed
    event.preventDefault();
    toggleButton(event.target);
  }
};

const toggleButton = (element) => {
  // Check to see if the button is pressed
  var pressed = (element.getAttribute("aria-pressed") === "true");
  // Change aria-pressed to the opposite state
  element.setAttribute("aria-pressed", !pressed);
};

const syncData = () => {
  DBHelper.syncOutBoxData().then(outBoxData => {
    if (outBoxData.length > 0) {
      outBoxData.forEach(async (data) => {
        console.info(`Syncing OutBox Data: ${JSON.stringify(data)}`);
        let primaryKey, response;
        primaryKey = data.createdAt;

        if (Object.keys(data).indexOf('is_favorite') > -1) {
          response = DBHelper.toggleFavBtn(data);
        } else {
          response = await DBHelper.addReview(data);
        }

        console.info(`Uploaded pending request ${JSON.stringify(response)}`);
        response = await DBHelper.clearOutBoxData(primaryKey)
        console.info(`Removed data from Outbox: ${response}`);
      });
    }
  }).catch(error => {
    console.error('outBoxData', error.stack);
  });
}

const isOnline = (event) => {
  let toastMsg;
  if (event.type == "offline") {
    console.log(`You lost connection.`);
    toastMsg = `You lost connection.`
    isConnected = false;
  }

  if (event.type == "online") {
    console.log(`You are now online.`);
    toastMsg = `You are now online.`;
    isConnected = true;
    syncData();
  }
  showToast(toastMsg);
}

const showToast = (toastMsg) => {
  Snackbar.show({
    text: toastMsg,
    actionText: 'OK',
    actionTextColor: '#f44336',
    textColor: '#fff',
    pos: 'bottom-center'
  });
}
window.addEventListener('online', isOnline);
window.addEventListener('offline', isOnline);
