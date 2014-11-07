'use strict';

angular.module('dashboard.references', [])

  .config(function ($stateProvider) {
    $stateProvider
      .state('dashboard.references', {
        url: '^/dashboard/references',
        templateUrl: '/app/dashboard/references-index.tpl.html',
        controller: 'ReferencesController as referencesCtrl',
        resolve: {
          referencesResponse: function (References) {
            return References.index();
          }
        }
      })
      .state('dashboard.references/detail', {
        url: '^/dashboard/references/:referenceId',
        templateUrl: '/app/dashboard/references-show.tpl.html',
        controller: 'ReferenceController as referenceCtrl',
        resolve: {
          referenceResponse: function (References, $stateParams) {
            return References.show($stateParams.referenceId);
          },
          preloadHabitats: function (Habitats) {
            return Habitats.load();
          },
          preloadSubstrates: function (Substrates) {
            return Substrates.load();
          }
        }
      });
  })

  .controller('ReferencesController', function ($scope, $state, referencesResponse, References) {
    var that = this;
    var references = referencesResponse.data.references;
    var meta = referencesResponse.data.meta;

    this.tableParams = {
      prefix: 'references',
      data: references,
      columns: References.fields(),
      meta: meta.references,
      sort: 'authors',
      editUrl: $state.current.url,
      paginatorPages: 10,
      getData: function (attrs) {
        References.index(attrs).success(function (data) {
          that.tableParams.meta = data.meta.references;
          that.tableParams.data = data.references;
        });
      }
    };
  })

  .controller('ReferenceController', function ($scope, referenceResponse, Species, Characteristics, $modal, characteristicComponent, References, $timeout) {
    var referenceCtrl = this;
    var reference = referenceResponse.data.references;
    var initialCharacteristic = {
      referenceId: reference.id
    };

    referenceCtrl.fields = References.fields();

    $scope.reference = reference;

    $scope.updateField = function (field, value) {
      var data = {
        id: reference.id
      };
      data[field] = value;
      return References.save({
        data: data,
        url: referenceResponse.data.links.references
      }).then(function(){}, function (response) {
        return response.data.errors.details[0];
      });
    };

    // show characteristic component as soon as a species is selected
    $scope.$watch('speciesId', function (speciesId) {
      if (angular.isDefined(speciesId)) {
        Characteristics
          .get({ speciesId: speciesId, referenceId: reference.id})
          .success(function (data, status, headers, config) {
            $scope.characteristic = angular.isDefined(data.characteristics[0]) ? data.characteristics[0]
              : angular.copy(initialCharacteristic);

            characteristicComponent.initialize($scope.characteristic.id, $scope.characteristic, config.url);
          });
      }
    });

    // hide characteristic component if species name is manually altered
    $scope.$watch('speciesFullName', function (newValue) {
      if ($scope.speciesId && (angular.isUndefined(newValue) || newValue.length === 0)) {
        referenceCtrl.reset(true);
      }
    });

    // track changes of characteristics (only for updating existing)
    $scope.$watch('characteristic', function (newValue, oldValue) {
      if (angular.isDefined(oldValue) && angular.isDefined(newValue)) {
        $scope.dirty = characteristicComponent.trackChanges(newValue);
      }
      $scope.emptyParams = characteristicComponent.emptyParams(newValue);
    }, true);


    referenceCtrl.saveCharacteristic = function () {
      characteristicComponent.saveCharacteristic($scope.characteristic, referenceCtrl.reset, $scope.resetDialog, referenceCtrl.refresh);
    };

    referenceCtrl.refresh = function () {
      References.show($scope.reference.id).success(function (data) {
        $scope.reference.characteristics = data.references.characteristics;
        $scope.characteristicRow.show();
      });
    };

    referenceCtrl.reset = function (keepSpeciesName) {
      $scope.dirty = false;
      $scope.emptyParams = false;
      $scope.speciesId = undefined;
      if (angular.isUndefined(keepSpeciesName)) {
        $scope.speciesFullName = undefined;
      }
      characteristicComponent.reset($scope.characteristic);
      $scope.characteristic = undefined;
    };

    $scope.resetDialog = {
      modal: $modal({
        scope: $scope,
        template: 'common/templates/modal-reset.tpl.html',
        show: false
      }),
      title: function () {
        return $scope.reference.fullTitle;
      },
      subtitle: function () {
        if (angular.isDefined($scope.speciesFullName)) {
          return $scope.speciesFullName;
        }
        else if (angular.isDefined($scope.characteristic)) {
          return $scope.characteristic.species.fullName;
        }
      },
      hide: function () {
        this.modal.hide();
      },
      show: function () {
        this.modal.show();
      },
      save: function () {
        referenceCtrl.saveCharacteristic();
      },
      reset: function () {
        referenceCtrl.reset();
        this.modal.hide();
        $timeout(function () {
          $scope.characteristicRow.show();
        }, 1);
      },
      close: function () {
        this.hide();
      }
    };

    $scope.deleteDialog = {
      modal: $modal({
        scope: $scope,
        template: 'common/templates/modal-delete.tpl.html',
        show: false
      }),
      title: function () {
        return $scope.reference.fullTitle;
      },
      subtitle: function () {
        if (angular.isDefined($scope.characteristic) && angular.isDefined($scope.characteristic.species)) {
          return $scope.characteristic.species.fullName;
        }
      },
      hide: function () {
        this.modal.hide();
      },
      show: function () {
        this.modal.show();
      },
      destroy: function () {
        var deleteDialogContext = this;
        Characteristics
          .httpDelete(characteristicComponent.getAttrs($scope.characteristic))
          .success(function () {
            References.show($scope.reference.id).success(function (data) {
              deleteDialogContext.hide();
              referenceCtrl.reset();
              $scope.reference.characteristics = data.references.characteristics;
            });
          });
      }
    };

    referenceCtrl.typeAheadProperties = {
      icon: 'species',
      key: 'fullName',
      placeholder: 'To add or edit characteristic type in the species name',
      getData: function (val) {
        return Species.index({ filterTarget: 'name,genus', fields: 'id,fullName', filterValue: val})
          .then(function (response) {
            return response.data.species;
          });
      }
    };
  });