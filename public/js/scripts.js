
// function for button click
function navigateToPage(route) {
  window.location.href = route;
}

// alert for unfilled fields in the review form
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

    // rLable.textContent='huttoo';
    let warnningMessage = 'Plaese enter ';
    if (uName.value.length == '') {
      warnningMessage += 'name'
      alert(warnningMessage);
      return;
    }
    if (!isSelect) {
      warnningMessage += 'rating'
      alert(warnningMessage);
      return;
    }
    if(reviewText.value.length == ''){
      warnningMessage+='review'
      alert(warnningMessage);
      return;
    }
  }

  // Attach the function to the button's click event
  submitButton.addEventListener('click', onClick);
});
