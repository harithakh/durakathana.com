// alert for unfilled fields in the review form - reviews.ejs
document.addEventListener('DOMContentLoaded', function () {

  const uName = document.getElementById('userNameInput');
  const rating = document.getElementsByName('starScore');
  const submitButton = document.getElementById('reviewSubmitButton');
  const reviewText = document.getElementById('reviewTextInput');


  // Define the function to run when the button is clicked
  function onClick() {
    // if a radio button clicked isSelect become true.
    let isSelect;
    for (let i = 0; i < rating.length; i++) {
      if (rating[i].checked) {
        isSelect = true;
      }
    }

    // // rLable.textContent='new text ';
    if (uName.value.length == '') {
      alert('නම ඇතුළත් කරන්න');
      return;
    }
    if (!isSelect) {
      alert('phone එකට දෙන තරු ගණන select කරන්න');
      return;
    }
    if (reviewText.value.length == '') {
      alert("Review එක type කරන්න ");
      return;
    }
  }

  // Attach the function to the button's click event
  submitButton.addEventListener('click', onClick);
});


// change star according to radio button click - reviews.ejs
function displayStars(numOfStars) {
  let stars = document.getElementById('starsDisplayP');

  const gold = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="gold" class="bi bi-star-fill" viewBox="0 0 16 16">
  <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
</svg>`;

  const gray = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="gray" class="bi bi-star-fill" viewBox="0 0 16 16">
  <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
</svg>`;


  if (numOfStars == '1') {
    stars.innerHTML = gold + gray + gray + gray + gray;
  } else if (numOfStars == '2') {
    stars.innerHTML = gold + gold + gray + gray + gray;
  } else if (numOfStars == '3') {
    stars.innerHTML = gold + gold + gold + gray + gray;
  } else if (numOfStars == '4') {
    stars.innerHTML = gold + gold + gold + gold + gray;
  } else if (numOfStars == '5') {
    stars.innerHTML = gold + gold + gold + gold + gold;
  }

}