import {Component} from '@angular/core';
import {NavigationEnd, Router} from "@angular/router";
import {filter} from "rxjs/operators";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  /** True when the toolbar/nav should be hidden — the actual home page, plus the popped-out player-view window (which is meant to be a clean, standalone screen for players, not a page users navigate away from via the main site nav). */
  hideToolbar = true;
  private hideToolbarPaths = ['/', '/map-maker/player'];

  constructor(private router: Router) {
    this.hideToolbar = this.hideToolbarPaths.includes(this.router.url);
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => {
        this.hideToolbar = this.hideToolbarPaths.includes(event.urlAfterRedirects);
      });
  }
}
