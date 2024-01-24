function toggleInactive(){
    const button = document.getElementById("toggle-inactive")
    const inactives = document.querySelectorAll(".inactive")
    inactives.forEach((obj) => {
        obj.style.display = obj.style.display === 'grid' ? '' : 'grid';
    });
    if (button.classList.contains("show-inactive")){
        button.textContent = "Show Inactive Routes";
    } else {
        button.textContent = "Hide Inactive Routes";
    }
    button.classList.toggle("show-inactive");
}

function searchRoutes(){
    let input = document.getElementById("route-search").value;
    input = input.toLowerCase();
    let cards = document.getElementsByClassName("route-card");

    console.log(input);
    for (i = 0; i < cards.length; i++){
        const routeName = cards[i].getAttribute("route-name")
        //const routeID = cards[i].getAttribute("route-id")
        if (!routeName.includes(input)){
            cards[i].style.display="none";
        } else {
            cards[i].style.display="grid";
        }
    }
}

function expandSearch(){
    document.querySelector(".address-search").classList.remove("single");
    document.querySelector(".tools").style.display="flex";
}

function refreshState(){
    document.getElementById("destination").value='';
    document.getElementById("origin").value='';
}

function closeSearch(){
    document.querySelector(".address-search").classList.add("single");
    document.querySelector(".tools").style.display="none";
    document.getElementById("rec-list").style.display="none";
    document.getElementById("origin").value='';
    document.getElementById("destination").value='';

    const routeCards = document.querySelectorAll(".route-card");
    for (const card of routeCards){
        if (!card.classList.contains("inactive")){
            card.style.display = "flex";
        }
    }
}
    
