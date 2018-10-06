let restaurant;
var newMap;
const MAPBOX_API_KEY = "pk.eyJ1IjoiaXN0aWFxdWUxOCIsImEiOiJjampjbzhxYnEyM3ZlM3Z0ZWRncHVsOXEyIn0.G92w014uYkp64EiGScJH8Q";
let isConnected = navigator.onLine;

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  if (!isConnected) {
    showToast(`Viewing content in offline!!`);
  }
  initMap();
});

/**
 * Initialize leaflet map
 */
const initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.newMap = L.map('map', {
        center: [restaurant.latlng.lat, restaurant.latlng.lng],
        zoom: 16,
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
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
    }
  });
};

/* window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
}; */

/**
 * Get current restaurant from page URL.
 */
const fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    let error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }

      DBHelper.fetchRestaurantReviews(self.restaurant, (error, reviews) => {
        DBHelper.syncOutBoxData().then(outBoxData => {
          if (outBoxData.length > 0) {
            let restaurant = outBoxData.filter(obj => Object.keys(obj).indexOf('is_favorite') > -1);
            if (restaurant.length > 0) {
              restaurant.forEach(eachRestaurant => {
                if ((eachRestaurant.id === id)) {
                  self.restaurant = eachRestaurant;
                }
              })
            }

            outBoxData = outBoxData.filter(obj => Object.keys(obj).indexOf('is_favorite') === -1)
            reviews.push(...outBoxData);
          }

          self.reviews = reviews.reverse();
          if (!reviews) {
            console.error(error);
          }

          fillRestaurantHTML();
          callback(null, restaurant)
        }).catch(error => {
          console.error('outBoxData', error.stack);
        });
      });
    });
  }
};

/**
 * Create restaurant HTML and add it to the webpage
 */
const fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  let is_favorite = ((restaurant.is_favorite === "true") || restaurant.is_favorite === true) ? true : false;
  const btn_favourite = document.querySelector('.btn_favourite');
  btn_favourite.id = `btn_favourite_${restaurant.id}`;
  btn_favourite.className = `btn_favourite${is_favorite ? ' isFavourite' : ""}`;
  btn_favourite.setAttribute('aria-label', (is_favorite) ? `Mark ${restaurant.name} restaurant as not favourite` : `Mark ${restaurant.name} restaurant as favourite`);
  btn_favourite.setAttribute('aria-pressed', is_favorite);

  btn_favourite.addEventListener('click', (e) => {
    if (!isConnected) {
      showToast(`Not connected, Your action will be updated once re-connected!`);
    }

    btn_favourite.classList.toggle('isFavourite');
    is_favorite = btn_favourite.classList.contains('isFavourite');
    btn_favourite.setAttribute('aria-label', is_favorite ? `Mark ${restaurant.name} restaurant as not favourite` : `Mark ${restaurant.name} restaurant as favourite`);
    btn_favourite.setAttribute('aria-pressed', is_favorite);
    restaurant.is_favorite = is_favorite;
    DBHelper.toggleFavBtn(restaurant).then(favourite => {
      console.info(`Updated your favourite restaurant: ${JSON.stringify(favourite)}`);
    }).catch(error => {
      console.error(`Failed updating favourite restaurant: ${error.stack}`);
      showToast(`Failed to save restaurant data`);
    });
  });

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;
  address.setAttribute('aria-label', `restaurant address ${restaurant.address}`);

  const image = document.getElementById('restaurant-img');
  const imgsrc = DBHelper.imageUrlForRestaurant(restaurant);
  image.className = 'restaurant-img'
  image.src = `/build/img/${imgsrc}.webp`;
  image.srcset = `/build/img/${imgsrc}.webp 1x, /build/img/${imgsrc}.jpg 2x`;

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;
  image.alt = `Image of restaurant name ${restaurant.name}, cuisine type ${restaurant.cuisine_type}`;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
};

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
const fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.tabIndex = 0;
    row.appendChild(time);

    hours.appendChild(row);
  }
};

/**
 * Create all reviews HTML and add them to the webpage.
 */
const fillReviewsHTML = (reviews = self.reviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h3');
  title.innerHTML = 'Reviews';
  title.tabIndex = 0;
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }

  title.insertAdjacentElement("afterend", document.getElementById('review_form'));
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
};

/**
 * Create review HTML and add it to the webpage.
 */
const createReviewHTML = (review) => {
  const li = document.createElement('li');
  li.tabIndex = 0;

  const topDiv = document.createElement('div');
  topDiv.setAttribute('id', `head`);
  const name = document.createElement('p');
  name.setAttribute('class', 'alignLeft');
  name.innerHTML = review.name;
  topDiv.appendChild(name);

  const date = document.createElement('p');
  date.setAttribute('class', 'alignRight');
  const createdDated = new Date(review.createdAt);
  date.innerHTML = createdDated.toDateString().substring(createdDated.toDateString().indexOf(' ') + 1);
  topDiv.appendChild(date);

  li.appendChild(topDiv);

  const bottomDiv = document.createElement('div');
  bottomDiv.setAttribute('id', 'bottom');
  const p = document.createElement('p');
  const rating = document.createElement('span');
  p.setAttribute('class', 'rating')
  rating.innerHTML = `Rating: ${review.rating}`;
  p.appendChild(rating);
  bottomDiv.appendChild(p);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  bottomDiv.appendChild(comments);

  li.appendChild(bottomDiv);

  const info = `${review.name} reviewed on ${review.date} with rating of ${review.rating} and provided his comment ${review.comments}`;
  li.setAttribute('aria-label', info)

  return li;
};

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
const fillBreadcrumb = (restaurant = self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  li.tabIndex = 0;
  // li.setAttribute('aria-label', restaurant.name);
  li.setAttribute('aria-current', 'page');
  breadcrumb.appendChild(li);
};

/**
 * Get a parameter by name from page URL.
 */
const getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
};


document.getElementById('review-form').addEventListener('submit', (event) => {
  event.preventDefault();

  if (!isConnected) {
    showToast(`Not connected, Review will be uploaded once re-connected!`);
  }

  const restaurant_id = self.restaurant.id;
  const name = document.getElementById('reviewer-name').value;
  let rating = document.getElementById('rating-select');
  rating = rating[rating.selectedIndex].value;
  const comments = document.getElementById('txt_comment').value;
  const createdAt = Date.now();
  const updatedAt = Date.now();
  const review = { restaurant_id, name, rating, comments, createdAt, updatedAt };

  DBHelper.addReview(review).then(response => {
    document.getElementById('review-form').reset();
    const ul = document.getElementById('reviews-list');
    ul.insertBefore(createReviewHTML(review), ul.childNodes[0]);
  }).catch(error => {
    document.getElementById('review-form').reset();
    const ul = document.getElementById('reviews-list');
    ul.insertBefore(createReviewHTML(review), ul.childNodes[0]);
  });
});


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
      showToast(`Your pending request uploaded successfully`);
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